# FINOVA Engineering Roadmap

## Current release
- [x] Responsive glassmorphism finance dashboard
- [x] Local transaction, savings, gold, budget and goal records
- [x] JSON backup and restore
- [x] Basic PWA manifest and service-worker shell cache
- [x] Supabase schema foundation drafted with per-user RLS

## Next
- [ ] Create Supabase project and run migration
- [ ] Verify RLS policies with two test accounts
- [ ] Add Supabase Auth UI
- [ ] Add explicit cloud backup/restore
- [ ] Add safe local-to-cloud migration
- [ ] Add offline sync queue and conflict resolution
- [ ] Add server-side licence and subscription verification
- [ ] Add automated smoke tests and release checks

## Product principles
- Local-first: the dashboard should remain useful when offline.
- Privacy: users must only access their own financial records.
- Security: never expose service-role keys in client code.
- Honest status: do not label manual gold price as live.
- Data portability: users can export and restore their data.
