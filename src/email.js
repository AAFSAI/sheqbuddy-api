import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter;

function emailEnabled() {
  return (
    config.email.provider === "smtp" &&
    config.email.smtp.host &&
    config.email.smtp.user &&
    config.email.smtp.password
  );
}

function getTransporter() {
  if (!emailEnabled()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.password
      }
    });
  }

  return transporter;
}

function registrationAdminText(registration) {
  return `New SHEQBuddy organisation registration

Registration: ${registration.id}
Company: ${registration.company}
ACN / ABN: ${registration.businessNumber || "-"}
Contact: ${registration.contactName}
Email: ${registration.email}
Phone: ${registration.phone || "-"}
Approx. users: ${registration.requestedUsers || "-"}
Plan: ${registration.plan}
Payment status: ${registration.paymentStatus}
Stage: ${registration.stage}
Notes: ${registration.notes || "-"}

Open the System Admin portal:
https://register.sheqbuddy.com
`;
}

function registrationCustomerText(registration) {
  return `Hello ${registration.contactName},

Thank you for registering ${registration.company} for SHEQBuddy.

Your registration request has been received.

Registration reference: ${registration.id}
ACN / ABN: ${registration.businessNumber || "-"}
Approx. users: ${registration.requestedUsers || "-"}
Status: Pending payment confirmation and setup approval

Next steps:
1. SHEQBuddy will verify payment or contact you if more information is required.
2. After approval, your company contact will receive the app access link and activation details.
3. Your Company/User Admin will then set up users, divisions/branches and manager access in the SHEQBuddy app.

Payment options:
PayPal: https://www.paypal.com/ncp/payment/GZ5K6E5GYGX5W
Bank transfer: RAMA Technologies, NAB, BSB 084-789, Acc 11-868-5826

Support: info@sheqbuddy.com
`;
}

export async function sendRegistrationEmails(registration) {
  const smtp = getTransporter();
  if (!smtp) {
    return { sent: false, reason: "SMTP email is not configured" };
  }

  const from = config.email.from;
  const adminMessage = {
    from,
    to: config.email.notifyTo,
    replyTo: registration.email,
    subject: `SHEQBuddy registration ${registration.id} - ${registration.company}`,
    text: registrationAdminText(registration)
  };
  const customerMessage = {
    from,
    to: registration.email,
    replyTo: config.email.notifyTo,
    subject: `SHEQBuddy registration received - ${registration.id}`,
    text: registrationCustomerText(registration)
  };

  await smtp.sendMail(adminMessage);
  await smtp.sendMail(customerMessage);

  return { sent: true };
}
