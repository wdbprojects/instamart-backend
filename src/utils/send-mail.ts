import resend from "../config/resend";
import { EMAIL_SENDER, NODE_ENV } from "../constants/env";

type ResendParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const getFromEmail = () => {
  return NODE_ENV === "development" ? "onboarding@resend.dev" : EMAIL_SENDER;
};
const sendToEmail = (toEmail: string) => {
  return NODE_ENV === "development" ? "delivered@resend.dev" : toEmail;
};

export const sendMailORIG = async ({
  to,
  subject,
  text,
  html,
}: ResendParams) => {
  await resend.emails.send({
    from: getFromEmail(),
    to: sendToEmail(to),
    subject: subject,
    text: text,
    html: html,
  });
};

export const sendMail = async ({ to, subject, text, html }: ResendParams) => {
  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: sendToEmail(to),
    subject: subject,
    text: text,
    html: html,
  });
  return { data, error };
};
