# Changelog

## v2.0.0 — Statistical model + feedback

### Added
- Multi-server queue simulation for active wrestling mats.
- Monte Carlo simulation of uncertain bout durations.
- Median wait-time estimate and 10th–90th percentile likely range.
- Visible deterministic baseline for comparison.
- Mat-specific queue simulation when `Bouts Ahead on Your Mat` is supplied.
- Anonymous feedback form with optional actual wait-time submission.
- Supabase feedback client and insert-only database policy template.
- `.env.example` and GitHub Actions environment-variable support.

### Changed
- Clarified `Current Tournament Bout Number` as `Latest Called Bout Number` to match the queue model.
- Updated disclaimer to distinguish statistical estimates from live tournament tracking.
- Removed remaining Bolt-specific project references.

### Model note
The v2.0 Monte Carlo model currently assumes lognormal bout-duration variability with coefficient of variation 0.45. This is a modeling assumption, not yet an empirical estimate. Replace or calibrate it after collecting enough real tournament observations.
