import { NextRequest, NextResponse } from "next/server";

// Helper function to escape Markdown special characters
function escapeMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\_/g, "\\_") // Escape existing escapes of underscore first
    .replace(/\*/g, "\\*") // Escape existing escapes of asterisk
    .replace(/\`/g, "\\`") // Escape existing escapes of backtick
    .replace(/\[/g, "\\[") // Escape existing escapes of open bracket
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[");
}

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

      let telegramMessage = `📢 Vercel Deployment Update (${escapeMarkdown(
        deploymentStatus.toUpperCase()
      )})\n\n`;
      telegramMessage += `**Project:** ${escapeMarkdown(projectName)}\n`;
      telegramMessage += `**Deployment URL:** ${escapeMarkdown(
        deploymentUrl
      )}\n`;
      telegramMessage += `**Deployment ID:** ${escapeMarkdown(deploymentId)}\n`;
      telegramMessage += `**Commit Author:** ${escapeMarkdown(commitAuthor)}\n`;
      telegramMessage += `**Commit Message:** ${escapeMarkdown(
        commitMessage
      )}\n`;
      telegramMessage += `**Commit SHA:** ${escapeMarkdown(commitSha)}\n`;
      telegramMessage += `**Timestamp (UTC):** ${escapeMarkdown(
        new Date(body.createdAt).toISOString()
      )}\n`;
      telegramMessage += `**Environment:** ${escapeMarkdown(
        payload.target || "N/A"
      )}\n`;

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
        const telegramResponse = await fetch(telegramApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(telegramParams),
        });

        if (!telegramResponse.ok) {
          const errorData = await telegramResponse.json();
          console.error("Error sending Telegram message:", errorData);
          return new NextResponse("Error sending Telegram notification", {
            status: telegramResponse.status,
          });
        }

        const responseData = await telegramResponse.json();
        console.log("Telegram message sent:", responseData);
        return new NextResponse("Telegram notification sent", { status: 200 });
      } catch (error: unknown) {
        console.error(
          "Error sending Telegram message:",
          error instanceof Error ? error.message : String(error)
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
