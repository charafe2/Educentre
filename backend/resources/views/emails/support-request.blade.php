<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Nouvelle demande de support</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7f7; font-family: -apple-system, 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e8eeee;">
          <tr>
            <td style="background-color:#0f172a; padding:20px 28px;">
              <span style="color:#ffffff; font-size:16px; font-weight:700;">Moujtahid &middot; Support</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h2 style="margin:0 0 4px; font-size:18px; color:#0f172a;">{{ $subjectLine }}</h2>
              <p style="margin:0 0 20px; font-size:13px; color:#64748b;">
                Envoyé par <strong>{{ $senderName }}</strong> ({{ $senderEmail }}) &middot; {{ $centreName }}
              </p>
              <div style="background-color:#f5f7f7; border-radius:8px; padding:16px; font-size:14px; line-height:1.6; color:#0f172a; white-space:pre-wrap;">{{ $messageBody }}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
