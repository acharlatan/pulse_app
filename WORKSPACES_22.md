# Workspaces and beta support — revision 22

The app header provides a workspace switcher on desktop and mobile. The existing workspace switch path still checks unfinished tracked edits, isolates Demo and Personal IndexedDB databases and clears the in-memory Google session on workspace change. Once confirmed, switching returns to Home so an unrelated record from the previous workspace is not displayed. Neither workspace is reset.

Personal Home reminds a user with saved records when no backup download has been requested or the most recent request is at least 30 days old. This uses the existing workspace-local export request timestamp. A requested download does not prove the file was retained; copy instructs the user to check and safeguard it. Users control when to export and can ignore the reminder. No database schema changes or automatic cloud backup are introduced.

Help explains the role of the main workspaces and unknown history. Beta feedback is prepared in local component state and may be copied or manually selected; no message, analytics or personal records are transmitted automatically. Users decide where to share it.
