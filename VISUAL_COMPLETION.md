# Pulse visual completion

The People directory now brings live workspace counts, recent contacts and search together before the records. The demo quick tour houses the workspace introduction. Daily Pulse puts the daily plan ahead of the optional personal overview. Secondary screen headings and loading states use the same light and dark palette as the November visual release.

The shared shell retains its appearance shortcut, bilingual and multilingual interface resources, Help guides, footer links and existing navigation. Orbit portrait targets follow the projected bodies. Labels can extend beyond a portrait without intercepting a neighbouring target. On narrow displays the Commitments chart scrolls inside its column and the footer clears the bottom navigation.

The release stylesheet remains the shared foundation. The final rules in `src/finish.css` cover directory layouts, secondary headings, route loading, and specific responsive or contrast fixes. Application storage and backups already use version 7. The release metadata reflects that version.

## Verification

The visual-completion CI job exercises 17 demo screens in both saved themes at 320, 375, 390, 430, 768, 1024, 1280 and 1440 CSS pixels. It checks horizontal overflow at every width and runs axe at 390 and 1440 pixels. The visual-release job also exercises the appearance shortcut, guides, empty personal workspace, individual Analytics reports and Orbit motion. The Release checks workflow records the result for each commit.

These Chromium checks supplement the unit, Worker, core journey, recovery and offline-update suites. Physical-device and native screen-reader testing are outside the coverage of these jobs.
