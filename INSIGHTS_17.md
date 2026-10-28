# PULSE Insights — experience revision 17

Analytics, Orbit, Review, My Focus and Automations now have distinct compositions and clearer paths from evidence to action. The data model, DB/backup v6, transactional repositories, permission rules, progress corrections, saved media, local-only defaults and integration activation boundaries remain intact. No new dependencies, remote assets or predictive service are introduced.

## Analytics: an evidence-led focus briefing

Overview leads with three explicit lanes: overdue commitments, eligible opportunity reviews and eligible relationship reviews. Overdue tasks are administrative review targets, not authorization to contact anyone. The other lanes use the shared recommendation queue and opportunity explanations, honoring blocked and deferred reviews and the selected record scope. No independent health algorithm, hidden score, sentiment inference or projected return is introduced. Each target opens its saved record and can be explicitly pinned through the existing Focus repository.

Coverage counts distinct current in-scope people with a past, meaningful conversation in the selected period. Notes, future entries and imported last-contact metadata do not count. Company comparisons preserve the company saved on each conversation; current work uses its own saved company. A person changing employers never moves an old conversation to the new employer. The denominator for coverage remains the current scoped people, explicitly separate from historical company activity. Company rows initially show four entries and expand on request.

Current needs and open opportunity values are labeled snapshots. Conversation/completion activity uses selected dates and workspace timezone. Values remain separate by currency; unknown values and insufficient stage history stay unknown. No forecast, historic on-time rate or conversation-based relationship-quality score is fabricated.

The Overview uses seven-day display groups for 15–90 day ranges, starting at the selected first date. Short ranges retain daily buckets and long ranges use months. Every group retains exact source bounds, including real zero-activity dates (future buckets are omitted), and opens matching conversations. CSV uses the same date-bucket predicate as the inspected records. Overview-to-Relationships drill-down clears a previously selected interaction-type filter so its cohort remains the one that produced the displayed count. Detailed relationship, opportunity, productivity, data-quality and stage-history reports remain available. General record filters are disclosed; date range remains immediately available and person/company deep links open scoped controls.

## Orbit: a starting point before a map

Desktop opens Explore, a company-led guide; mobile retains its equivalent List default with a clear Explore entry. Choosing a company scopes its actual saved companies, people and opportunities into readable groups. The connection key explains Works at, Company opportunity and Opportunity representative without implying personal relationships. Search, type/priority filters, scoped URLs, list navigation, record editors and Focus controls remain available.

Map is an explicit alternate view. Decorative rings no longer resemble relationship edges; only saved associations render as lines. Selecting a record highlights its direct visible edges. A saved-connections disclosure names related records and the actual edge meaning. Native button names follow their visible record/type text. The old deterministic layout, fixed solver budget, map caps (24 desktop/18 mobile), list/guide caps (60) and independent related-record limits remain. No external relationship discovery or person-person inference is added.

## Review, Focus and Automations

Review presents identity, the shared evidence and one primary administrative action. Pinning, logging, snoozing, dismissing and unsnoozing live under More review actions; their repository semantics are unchanged.

My Focus removes its self-navigation summary and repeated empty sections. A chosen record appears once: Today, its relevant pinned collection, or Recently completed. Today takes precedence over other collections. People retain identity/media; opportunities show saved value/stage; tasks show due state and open the shared editor. Completion, unpinning and daily selection keep their existing atomic paths. Completed task navigation opens the completed Activity view.

Automations lead with trigger/action templates and clear disabled-draft behavior. Rule sequences expose saved trigger, conditions and action. Execution controls and full local/foreground limitations remain under Execution & safety; nothing is sent automatically. Rule writes, stale-save checks, enable/pause/replay boundaries and history are unchanged.

## Verification boundaries

Nine new pure-reporting regressions cover historical company attribution, note/future exclusion, scope, blocked/deferred suggestions, deduplication, current-vs-period cohorts, currency separation, exact seven-day inspection, real zero buckets, bounded monthly output and non-colliding nullable company keys. Browser workflows cover inspecting/pinning an Analytics target, distinct Focus placement, scoped reporting, exact chart source counts, guided Orbit/Map/List/profile journeys, review snoozing and existing automation behavior. Responsive captures and axe cover all five screens in light/dark at 320/375/390/430/768/1024/1280/1440px, including the selected scoped map.

Final run counts, corrected exploratory findings and production evidence are recorded in the PR. Automated Chromium checks do not certify physical-device or native screen-reader behavior.
