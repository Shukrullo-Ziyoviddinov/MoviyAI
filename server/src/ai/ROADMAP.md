# Chat integration requirements

- Route text-only requests to Gemma; route image/video requests to Gemini.
- Store AI conversations and messages in a dedicated database collection, owned by the authenticated user.
- Show saved conversations in the previous conversations section of the sidebar on web and native.
- Restore conversation history when selected; pass relevant history to the model.
- Connect Serper movie discovery and verified movie/actor catalog storage in later steps.
