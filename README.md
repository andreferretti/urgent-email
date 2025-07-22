Useful commands

by default checks last 24 hours
`npx ts-node test-production.ts`

Checks in last hour
`npx ts-node test-production.ts 1`


Get new refresh token (expires every 7 days)
1. Go to https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) in top right
3. Check "Use your own OAuth credentials"
4. Enter:
  - OAuth Client ID: 609804117813-j30vd87t60ckocrat6c1aqobecp4s3dc.apps.googleusercontent.com
  - OAuth Client secret: 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
5. In the left panel, find Gmail API v1 and select:
  - https://www.googleapis.com/auth/gmail.readonly
6. Click "Authorize APIs"
7. Sign in with your Google account
8. Click "Exchange authorization code for tokens"
9. Copy the Refresh token from the response