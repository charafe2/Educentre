<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Nouvelle demande de démo</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7f7; font-family: -apple-system, 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e8eeee;">
          <tr>
            <td style="background-color:#0f172a; padding:20px 28px;">
              <span style="color:#ffffff; font-size:16px; font-weight:700;">Moujtahid &middot; Demande de démo</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h2 style="margin:0 0 4px; font-size:18px; color:#0f172a;">{{ $centreName }}</h2>
              <p style="margin:0 0 20px; font-size:13px; color:#64748b;">
                Nouvelle demande envoyée depuis le site public.
              </p>
              <table role="presentation" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:13px; color:#64748b;">Nom du centre</td>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:14px; color:#0f172a; text-align:right;">{{ $centreName }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:13px; color:#64748b;">Contact</td>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:14px; color:#0f172a; text-align:right;">{{ $fullName }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:13px; color:#64748b;">Téléphone</td>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:14px; color:#0f172a; text-align:right;">{{ $phone }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:13px; color:#64748b;">Taille du centre</td>
                  <td style="padding:8px 0; border-bottom:1px solid #eef2f2; font-size:14px; color:#0f172a; text-align:right;">{{ $centreSize }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:13px; color:#64748b;">Ville</td>
                  <td style="padding:8px 0; font-size:14px; color:#0f172a; text-align:right;">{{ $city }}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
