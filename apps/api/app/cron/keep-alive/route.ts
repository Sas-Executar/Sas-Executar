import { database, databaseAvailable } from "@repo/database";

export const GET = async () => {
  if (!databaseAvailable) {
    return Response.json(
      {
        ok: true,
        skipped: true,
        reason: "A persistência canônica usa Aurora Data API e não exige keep-alive.",
      },
      { status: 200 }
    );
  }

  const newPage = await database.page.create({
    data: {
      name: "cron-temp",
    },
  });

  await database.page.delete({
    where: {
      id: newPage.id,
    },
  });

  return new Response("OK", { status: 200 });
};
