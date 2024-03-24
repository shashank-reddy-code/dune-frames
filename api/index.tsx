import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar } from "frog/hubs";
import { handle } from "frog/vercel";
import { getFidStats, getRecommendations } from "./dune.js";
import dotenv from "dotenv";
dotenv.config();

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  hub: neynar({ apiKey: process.env["NEYNAR_API"] || "" }),
});

app.frame("/", async (c) => {
  return c.res({
    action: "/fid30dStats",
    image: (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(to right, #E1E1F9, #FFECEB)",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "black",
            fontSize: 50,
            fontStyle: "normal",
            letterSpacing: "-0.020em",
            lineHeight: 1.3,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
            display: "flex",
            flexDirection: "column",
            fontWeight: "bold",
          }}
        >
          Cast Sense: Get a pulse on your Farcaster activity{" "}
        </div>
      </div>
    ),
    intents: [<Button>Continue</Button>],
  });
});

app.frame("/fid30dStats", async (c) => {
  const { status, frameData, verified } = c;
  let trends_list: { key: any; value: any }[];
  console.log("loading...", status);

  if (status === "response" && verified) {
    console.log("running filter", frameData?.fid);
    trends_list = await getFidStats(frameData?.fid);
  }

  const types = ["casts", "followers", "likes", "recasts", "mentions"];
  return c.res({
    action: "/followerActiveHours",
    image: (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(to right, #E1E1F9, #FFECEB)",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "black",
            fontSize: 50,
            fontStyle: "normal",
            letterSpacing: "-0.020em",
            lineHeight: 1.3,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
            display: "flex",
            flexDirection: "column",
            fontWeight: "bold",
          }}
        >
          {types.map((type) => (
            <div
              key={type}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  width: "150px",
                  paddingRight: "20px", // Added padding to the right of the type
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexDirection: "row",
                }}
              >
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    marginRight: "10px",
                  }}
                >
                  {trends_list[`current_period_${type}`]}
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    color:
                      trends_list[`${type}_percentage_change`] < 0
                        ? "#ff4c4c"
                        : "#29cc97",
                  }}
                >
                  {trends_list[`${type}_percentage_change`] < 0 ? "↓" : "↑"}
                  {`${Math.abs(
                    trends_list[`${type}_percentage_change`]
                  ).toFixed(0)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    intents: [<Button>See more insights</Button>],
  });
});

export const GET = handle(app);
export const POST = handle(app);

devtools(app, { serveStatic });
