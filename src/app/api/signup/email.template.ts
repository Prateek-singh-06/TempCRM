export const otpTemplate = (otp: number) => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <style>
          .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              font-family: Arial, sans-serif;
              line-height: 1.6;
          }
          .otp-box {
              background-color: #f4f4f4;
              padding: 20px;
              text-align: center;
              border-radius: 5px;
              margin: 20px 0;
          }
          .otp-code {
              font-size: 32px;
              letter-spacing: 5px;
              color: #333;
              font-weight: bold;
          }
          .footer {
              font-size: 12px;
              color: #666;
              text-align: center;
              margin-top: 30px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="otp-box">
              <div class="otp-code">${otp}</div>
          </div>
          <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
          </div>
      </div>
  </body>
  </html>
  `;
}