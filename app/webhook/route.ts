import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Received Vercel notification:", body);

    // 1. Verify the Vercel Signature (Highly Recommended for Security)
    // You'll need to implement a function to verify the signature
    // using the Vercel CLI's secret.
    // const signature = req.headers.get('x-vercel-signature');
    // const rawBody = await req.text();
    // if (!signature || !verifyVercelSignature(rawBody, signature)) {
    //   console.error('Invalid Vercel signature');
    //   return new NextResponse('Invalid signature', { status: 401 });
    // }

    // 2. Extract Relevant Information from the Payload
    const { payload, type } = body;
    if (!payload || !type) {
      console.error("Invalid payload or type in Vercel notification");
      return new NextResponse("Invalid payload", { status: 400 });
    }

    if (
      type === "deployment.created" ||
      type === "deployment.succeeded" ||
      type === "deployment.failed"
    ) {
      const projectName = payload.name;
      const deploymentUrl = payload.url;
      const deploymentId = payload.deployment.id;
      const commitAuthor =
        payload.deployment.meta?.githubCommitAuthorName || "N/A";
      const commitMessage =
        payload.deployment.meta?.githubCommitMessage || "N/A";
      const commitSha = payload.deployment.meta?.githubCommitSha || "N/A";
      const deploymentStatus = type.split(".")[1]; // created, succeeded, failed

      let telegramMessage = `📢 Vercel Deployment Update (${deploymentStatus.toUpperCase()})\n\n`;
      telegramMessage += `**Project:** ${projectName}\n`;
      telegramMessage += `**Deployment URL:** ${deploymentUrl}\n`;
      telegramMessage += `**Deployment ID:** ${deploymentId}\n`;
      telegramMessage += `**Commit Author:** ${commitAuthor}\n`;
      telegramMessage += `**Commit Message:** ${commitMessage}\n`;
      telegramMessage += `**Commit SHA:** ${commitSha}\n`;
      telegramMessage += `**Timestamp (UTC):** ${new Date(
        body.createdAt
      ).toISOString()}\n`;
      telegramMessage += `**Environment:** ${payload.target}\n`;

      // 3. Send the Formatted Message to Telegram
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (!telegramBotToken || !telegramChatId) {
        console.error(
          "Telegram bot token or chat ID not configured in environment variables."
        );
        return new NextResponse("Telegram configuration error", {
          status: 500,
        });
      }

      const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const telegramParams = {
        chat_id: telegramChatId,
        text: telegramMessage,
        parse_mode: "Markdown", // Optional: Use Markdown for formatting
      };

      try {
        const telegramResponse = await axios.post(
          telegramApiUrl,
          telegramParams
        );
        console.log("Telegram message sent:", telegramResponse.data);
        return new NextResponse("Telegram notification sent", { status: 200 });
      } catch (error: any) {
        console.error(
          "Error sending Telegram message:",
          error.response ? error.response.data : error.message
        );
        return new NextResponse("Error sending Telegram notification", {
          status: 500,
        });
      }
    } else {
      console.log("Received other Vercel notification type:", type);
      return new NextResponse("Notification type not handled", { status: 200 });
    }
  } catch (error) {
    console.error("Error processing Vercel webhook:", error);
    return new NextResponse("Error processing webhook", { status: 500 });
  }
}
