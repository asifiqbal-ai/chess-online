# Chess Online
This is a simple online chess platform implemented with the MEAN stack. I will continuously update this document as I make more progress.
 
## Progress so far
 * Basic user authentication (HTTP) via the Passport package.
 * Basic user authentication (Sockets.io) via the Passport package.
 * Simple mapping of {user.id => socket}.

### Notes
 * Currently, session is being stored via express-session's default session store. I intend to configure a persistent memory store (most likely Redis), mainly for scalability and robustness.