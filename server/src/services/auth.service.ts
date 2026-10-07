import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Profile } from '../models/Profile.js';

export type AuthProfile = {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  searchGuideUnderstood: boolean;
};

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
};

function allowedAudiences() {
  return [
    env.googleWebClientId,
    env.googleAndroidClientId,
    env.googleIosClientId,
  ].filter(Boolean);
}

export async function verifyGoogleIdToken(idToken: string) {
  const { data } = await axios.get<GoogleTokenInfo>(
    'https://oauth2.googleapis.com/tokeninfo',
    { params: { id_token: idToken }, timeout: 10000 }
  );

  const googleId = String(data.sub ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const name = String(data.name ?? '').trim() || email.split('@')[0] || 'User';
  const picture = String(data.picture ?? '').trim();
  const verified =
    data.email_verified === true || data.email_verified === 'true';

  if (!googleId || !email) {
    throw new Error('INVALID_GOOGLE_TOKEN');
  }
  if (!verified) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  const audiences = allowedAudiences();
  if (audiences.length > 0 && data.aud && !audiences.includes(String(data.aud))) {
    throw new Error('INVALID_GOOGLE_AUDIENCE');
  }

  return { googleId, email, name, picture };
}

export function toAuthProfile(doc: {
  _id: { toString(): string };
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
  searchGuideUnderstood?: boolean | null;
}): AuthProfile {
  return {
    id: doc._id.toString(),
    googleId: doc.googleId,
    email: doc.email,
    name: doc.name,
    picture: doc.picture ?? '',
    searchGuideUnderstood: Boolean(doc.searchGuideUnderstood),
  };
}

export async function upsertGoogleProfile(input: {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}) {
  const doc = await Profile.findOneAndUpdate(
    { googleId: input.googleId },
    {
      $set: {
        email: input.email,
        name: input.name,
        picture: input.picture,
      },
      $setOnInsert: {
        googleId: input.googleId,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();

  if (!doc) {
    throw new Error('PROFILE_UPSERT_FAILED');
  }
  return toAuthProfile(doc);
}

export function signAccessToken(profile: AuthProfile) {
  return jwt.sign(
    {
      sub: profile.id,
      googleId: profile.googleId,
      email: profile.email,
    },
    env.jwtSecret,
    { expiresIn: '30d' }
  );
}

export function verifyAccessToken(token: string): AuthProfile | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      sub?: string;
      googleId?: string;
      email?: string;
    };
    if (!payload.sub) return null;
    return {
      id: String(payload.sub),
      googleId: String(payload.googleId ?? ''),
      email: String(payload.email ?? ''),
      name: '',
      picture: '',
      searchGuideUnderstood: false,
    };
  } catch {
    return null;
  }
}

export async function getProfileById(id: string) {
  const doc = await Profile.findById(id).lean();
  return doc ? toAuthProfile(doc) : null;
}

export async function dismissSearchGuide(userId: string) {
  const doc = await Profile.findByIdAndUpdate(
    userId,
    {
      $set: {
        searchGuideVisited: true,
        searchGuideUnderstood: true,
        searchGuideUnderstoodAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  ).lean();
  return doc ? toAuthProfile(doc) : null;
}

export async function loginWithGoogleIdToken(idToken: string) {
  const google = await verifyGoogleIdToken(idToken);
  const profile = await upsertGoogleProfile(google);
  const token = signAccessToken(profile);
  return { token, profile };
}
