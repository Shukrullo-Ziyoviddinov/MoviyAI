import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { VIDEO_PROBE_LIMITS } from '../config/video-tools.config.js';
import { VideoProbeError, type ProcessOutput } from '../types/video-probe.types.js';

export function classifyVideoToolFailure(stderr: string) {
  if (/sign in|log[ -]?in|cookies|private|not a bot|age.restrict|captcha|challenge|geo.restrict|403|429|rate.limit/i.test(stderr)) return new VideoProbeError('PLATFORM_BLOCKED');
  if (/not available|unavailable|not found|removed|deleted|404/i.test(stderr)) return new VideoProbeError('VIDEO_UNAVAILABLE');
  if (/network|timed out|connection|dns|unable to download|502|503|504/i.test(stderr)) return new VideoProbeError('NETWORK_ERROR');
  return new VideoProbeError('TOOL_FAILED');
}

/** Trusted executables only; fixed argument arrays, no shell and no application secrets. */
export function runVideoProcess(executable: string, args: string[], options: { cwd: string; signal?: AbortSignal; timeoutMs?: number }): Promise<ProcessOutput> {
  options.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = {};
    for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LANG', 'LC_ALL']) {
      if (process.env[key]) env[key] = process.env[key];
    }
    // Standalone yt-dlp and FFmpeg must also keep extracted/runtime files inside
    // the caller's owned workspace, so forced cancellation can clean them up.
    env.TEMP = options.cwd; env.TMP = options.cwd; env.TMPDIR = options.cwd;
    const child = spawn(executable, args, { cwd: options.cwd, env, shell: false, windowsHide: true,
      detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', bytes = 0, settled = false, reason: unknown;
    let termination = Promise.resolve();
    const kill = (): Promise<void> => {
      if (!child.pid) return Promise.resolve();
      if (process.platform === 'win32') {
        return new Promise(resolve => {
          const killer = spawn(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
          const killTimeout = setTimeout(() => { killer.kill(); child.kill(); resolve(); }, 3000);
          killer.once('error', () => { clearTimeout(killTimeout); child.kill(); resolve(); });
          killer.once('close', () => { clearTimeout(killTimeout); resolve(); });
        });
      } else {
        try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
        return new Promise(resolve => setTimeout(() => {
          try { process.kill(-child.pid!, 'SIGKILL'); } catch { /* Already exited. */ }
          resolve();
        }, 1500));
      }
    };
    const stop = (error: unknown) => { if (!reason) { reason = error; termination = kill(); } };
    const abort = () => stop(options.signal?.reason ?? new VideoProbeError('PROCESS_TIMEOUT'));
    const timer = setTimeout(() => stop(new VideoProbeError('PROCESS_TIMEOUT')), options.timeoutMs ?? VIDEO_PROBE_LIMITS.timeoutMs);
    timer.unref();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve({ stdout, stderr });
    };
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > VIDEO_PROBE_LIMITS.maxOutputBytes) { stop(new VideoProbeError('PROCESS_OUTPUT_LIMIT')); return; }
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-65536); // Retained only in memory for classification.
    });
    child.once('error', error => finish((error as NodeJS.ErrnoException).code === 'ENOENT' ? new VideoProbeError('TOOL_MISSING') : new VideoProbeError('TOOL_FAILED')));
    child.once('close', code => { void termination.then(() => finish(reason ?? (code === 0 ? undefined : classifyVideoToolFailure(stderr)))); });
  });
}
