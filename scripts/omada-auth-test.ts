import { loginOmadaCloud } from "../src/lib/omada/auth";
import { cookieNames } from "../src/lib/omada/http";
import { OmadaError } from "../src/lib/omada/errors";
import { getSites, getLoginStatus } from "../src/lib/omada/sites";
import {
  isOmadaCloudConfigured,
  OMADA_PATH_ID_WARNING,
  omadaCloudPathIdsAreIdentical,
} from "../src/lib/omada/config";
import { locationOmadaController, withOmadaController } from "../src/lib/omada/context";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  try {
    await run();
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  if (!isOmadaCloudConfigured()) {
    console.log("RESULT=not_configured");
    process.exitCode = 1;
    return;
  }

  try {
    console.log("STEP=cloud_login");
    const session = await loginOmadaCloud();
    console.log(`LOGIN=ok COOKIE_NAMES=${cookieNames(session.cookie).join(",")}`);
    console.log(`TOKEN_PRESENT=${Boolean(session.csrfToken)}`);
    console.log(`AUTHORIZATION_PRESENT=${Boolean(session.authorization)}`);
  } catch (error) {
    printFailure("cloud_login", error);
    process.exitCode = 1;
    return;
  }

  const location = await prisma.location.findFirst({
    where: {
      active: true,
      omadaDeviceId: { not: null },
      omadaId: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!location) {
    console.log("RESULT=logged_in_no_location_controller");
    return;
  }

  const ids = locationOmadaController(location);
  if (omadaCloudPathIdsAreIdentical(ids)) {
    console.log("WARNING=LOCATION_DEVICE_ID_EQUALS_OMADA_ID");
    console.log(`WARNING_DETAIL=${OMADA_PATH_ID_WARNING}`);
  }

  try {
    console.log("STEP=loginStatus");
    await withOmadaController(ids, async () => {
      await getLoginStatus();
      console.log("LOGIN_STATUS=ok");
      const sites = await getSites();
      console.log("RESULT=connected");
      console.log(`SITE_COUNT=${sites.length}`);
      for (const site of sites) {
        console.log(`SITE=${site.name}`);
      }
    });
  } catch (error) {
    printFailure("controller_api", error);
    process.exitCode = 1;
  }
}

function printFailure(step: string, error: unknown) {
  console.log("RESULT=failed");
  console.log(`FAILED_STEP=${step}`);
  if (error instanceof OmadaError) {
    console.log(`CODE=${error.code}`);
    if (error.omadaErrorCode !== undefined) {
      console.log(`OMADA_ERROR=${error.omadaErrorCode}`);
    }
    console.log(`MESSAGE=${error.message}`);
    return;
  }
  if (error instanceof Error) {
    console.log(`MESSAGE=${error.message}`);
  }
}

void main();
