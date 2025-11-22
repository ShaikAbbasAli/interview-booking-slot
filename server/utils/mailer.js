// server/utils/mailer.js
import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * sendOTPEmail(email, name, otp)
 */
export async function sendOTPEmail(email, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="color:#0ea5a4">Your verification code</h2>
      <p>Hello ${name || ''},</p>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:8px">${otp}</h1>
      <p>This code will expire in 5 minutes.</p>
      <hr/>
      <small>If you did not request this, ignore this email.</small>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Interview Booking" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Your verification code',
    html,
  });

  return info;
}
