import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar } from "frog/hubs";
import { handle } from "frog/vercel";
import {
  getFidStats,
  getFollowerActiveHours,
  getTopChannels,
  getFollowerTiers,
  getTopCast,
  getTrendingWords,
} from "./dune.js";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { summarizeReplies } from "./openai.js";
import dotenv from "dotenv";
dotenv.config();

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?name=TopMentions&icon=thumbsup&actionType=post&postUrl=https://cast-sense.vercel.app/api/cast/topMentions";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  hub: neynar({ apiKey: process.env["NEYNAR_API"] || "" }),
  verify: "silent",
  browserLocation: ADD_URL,
});

const NEYNAR_API_KEY = process.env.NEYNAR_API ?? "";
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

const tierDefinitions: Record<string, string> = {
  "🤖 npc": "Less than 400 followers",
  "🥉 active": "400+ followers, 1+ casts, 50+ engagement score",
  "🥈 star": "1k+ followers, 5+ casts, 500+ engagement score",
  "🥇 influencer": "10k+ followers, 10+ casts, 2500+ engagement score",
  "💎 vip": "50k+ followers, 10+ casts, 5000+ engagement score",
};

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
  const { status, frameData } = c;
  let trends_list: { key: any; value: any }[];
  console.log("loading...", status);

  if (status === "response") {
    console.log("running filter", frameData?.fid);
    trends_list = await getFidStats(frameData?.fid);
  }

  const types = [
    "casts",
    "replies",
    "followers",
    "likes",
    "recasts",
    "mentions",
  ];
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
          style={{ display: "flex", fontSize: "48px", marginBottom: "20px" }}
        >
          Your Farcaster activity trends over the last 30 days{" "}
        </div>

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
                  fontSize: "36px",
                  fontWeight: "bold",
                  width: "250px",
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
                    fontSize: "42px",
                    fontWeight: "bold",
                    marginRight: "10px",
                  }}
                >
                  {trends_list[`current_period_${type}`]}
                </span>
                <span
                  style={{
                    fontSize: "24px",
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
    intents: [<Button>Continue</Button>],
  });
});

app.frame("/followerActiveHours", async (c) => {
  const { status, frameData } = c;
  let weeklyHourlyCounts: Record<string, Record<string, number>> = {};
  console.log("loading...", status);

  if (status === "response") {
    console.log("running filter", frameData?.fid);
    weeklyHourlyCounts = await getFollowerActiveHours(frameData?.fid);
  }

  // Function to calculate the overall max and min across all days
  const calculateMaxMin = (
    weeklyHourlyCounts: Record<string, Record<string, number>>
  ) => {
    let allCounts: number[] = [];
    Object.values(weeklyHourlyCounts).forEach((dailyCounts) => {
      allCounts = allCounts.concat(Object.values(dailyCounts));
    });
    const maxCount = Math.max(...allCounts);
    const minCount = Math.min(...allCounts);
    return { maxCount, minCount };
  };

  // Now use the function in your existing code
  const { maxCount, minCount } = calculateMaxMin(weeklyHourlyCounts);
  // Function to interpolate between colors
  const interpolateColor = (value: number, max: number) => {
    const saturation = Math.round((value / max) * 100); // Calculate saturation as a percentage of the max
    const lightness = 100 - saturation; // Inverse relationship for lightness
    return `hsl(280, ${saturation}%, ${lightness}%)`; // Hue for purple is around 280
  };

  return c.res({
    action: "/followerActiveChannels",
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
          style={{ display: "flex", fontSize: "36px", marginBottom: "20px" }}
        >
          Your followers are most active on these days and hours of the week{" "}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day) => (
            <div
              key={day}
              style={{
                display: "flex",
                flexDirection: "row",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: "transparent",
                  margin: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  paddingRight: "20px",
                }}
              >
                {day.slice(0, 3)}{" "}
              </div>
              {Object.entries(
                weeklyHourlyCounts[`${day.toLowerCase()}_hourly_counts`]
              ).map(([hour, count]) => (
                <div
                  key={`${day}_${hour}`}
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: interpolateColor(count, maxCount),
                    margin: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      count > (maxCount - minCount) / 2 ? "white" : "black",
                    fontWeight: "bold",
                  }}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    intents: [<Button>Continue</Button>],
  });
});

app.frame("/followerActiveChannels", async (c) => {
  const { status, frameData } = c;
  let activeChannels: string[] = [];
  console.log("loading...", status);

  if (status === "response") {
    console.log("running filter", frameData?.fid);
    activeChannels = await getTopChannels(frameData?.fid);
  }

  return c.res({
    action: "/followerTiers",
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
            fontSize: "36px",
            fontStyle: "normal",
            letterSpacing: "-0.020em",
            lineHeight: "1.3",
            marginTop: "30px",
            padding: "0 120px",
            whiteSpace: "pre-wrap",
            display: "flex",
            flexDirection: "column",
            fontWeight: "bold",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "20px" }}>
            Your followers are most active on these channels
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: "20px",
              }}
            >
              {activeChannels
                .slice(0, activeChannels.length / 2)
                .map((channel) => (
                  <span
                    key={channel}
                    style={{
                      fontSize: "36px",
                      fontWeight: "bold",
                      marginBottom: "10px",
                      marginRight: "60px",
                    }}
                  >
                    {channel}
                  </span>
                ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activeChannels
                .slice(activeChannels.length / 2)
                .map((channel) => (
                  <span
                    key={channel}
                    style={{
                      fontSize: "36px", // Increased font size
                      fontWeight: "bold",
                      marginBottom: "10px", // Add space between items
                    }}
                  >
                    {channel}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    ),
    intents: [<Button>Continue</Button>],
  });
});

app.frame("/followerTiers", async (c) => {
  const { status, frameData } = c;
  let followerTiers: Record<string, { count: number; percentage: number }> = {};
  console.log("loading...", status);

  if (status === "response") {
    console.log("running filter", frameData?.fid);
    followerTiers = await getFollowerTiers(frameData?.fid);
  }

  return c.res({
    action: "/topCast",
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
            fontSize: "36px",
            fontStyle: "normal",
            letterSpacing: "-0.020em",
            lineHeight: "1.3",
            marginTop: "30px",
            padding: "0 120px",
            whiteSpace: "pre-wrap",
            display: "flex",
            flexDirection: "column",
            fontWeight: "bold",
          }}
        >
          <div style={{ fontSize: "50px", marginBottom: "20px" }}>
            Your followers segmented by tiers
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {Object.entries(followerTiers).map(([tier, stats]) => (
              <div key={tier} style={{ display: "flex", margin: "5px" }}>
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "36px",
                    marginRight: "10px",
                  }}
                >
                  {tier}:
                </span>
                <span style={{ fontSize: "36px" }}>
                  {stats.percentage} % ({stats.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    intents: [<Button>Continue</Button>],
  });
});

app.frame("/topCast", async (c) => {
  const { status, frameData } = c;
  let topCast: Record<string, string> = {};
  console.log("loading...", status);

  if (status === "response") {
    console.log("running filter", frameData?.fid);
    topCast = await getTopCast(frameData?.fid);
  }

  const imageUrl = `https://client.warpcast.com/v2/cast-image?castHash=${topCast.hash}`;
  return c.res({
    action: "/trendingWords",
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
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>
          Top cast of the month
        </div>
        <img src={imageUrl} alt="Top cast" width={400} height={400} />
      </div>
    ),
    intents: [<Button>Continue</Button>],
  });
});

app.frame("/trendingWords", async (c) => {
  const { status, frameData } = c;
  let trendingWords: string[] = [];
  console.log("loading...", status);

  if (status === "response") {
    console.log("running filter", frameData?.fid);
    trendingWords = await getTrendingWords(frameData?.fid);
  }

  return c.res({
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
            fontSize: "36px",
            fontStyle: "normal",
            letterSpacing: "-0.020em",
            lineHeight: "1.3",
            marginTop: "30px",
            padding: "0 120px",
            whiteSpace: "pre-wrap",
            display: "flex",
            flexDirection: "column",
            fontWeight: "bold",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "20px" }}>
            Trending words among your followers in the past week
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: "20px",
              }}
            >
              {trendingWords.slice(0, trendingWords.length / 2).map((word) => (
                <span
                  key={word}
                  style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                    marginRight: "60px",
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {trendingWords.slice(trendingWords.length / 2).map((word) => (
                <span
                  key={word}
                  style={{
                    fontSize: "36px", // Increased font size
                    fontWeight: "bold",
                    marginBottom: "10px", // Add space between items
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    intents: [],
  });
});

// Cast action handler
app.hono.post("/topMentions", async (c) => {
  const {
    trustedData: { messageBytes },
  } = await c.req.json();

  const result = await neynarClient.validateFrameAction(messageBytes);
  if (result.valid) {
    console.log(
      "fetching conversation for cast hash ",
      result.action.cast.hash
    );
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${result.action.cast.hash}&type=hash&reply_depth=5&include_chronological_parent_casts=false`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          api_key: process.env.NEYNAR_API || "",
        },
      }
    );
    const res = await response.json();
    const replies = res.conversation.cast.direct_replies.map((reply: any) => ({
      text: reply.text,
      num_likes: reply.reactions.likes + reply.reactions.recasts,
    }));

    let message = await summarizeReplies(res.conversation.cast.text, replies);
    console.log(message);

    if (message.length > 30) {
      console.log("Received long message, truncating");
      message = message.slice(0, 30);
    }

    return c.json({ message });
  } else {
    return c.json({ message: "Unauthorized" }, 401);
  }
});

app.hono.get("/topMentions/:hash", async (c) => {
  const castHash = c.req.param("hash");
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${castHash}&type=hash&reply_depth=5&include_chronological_parent_casts=false`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API || "",
      },
    }
  );
  const result = await response.json();
  const replies = result.conversation.cast.direct_replies.map((reply: any) => ({
    text: reply.text,
    num_likes: reply.reactions.likes + reply.reactions.recasts,
  }));

  let message = await summarizeReplies(result.conversation.cast.text, replies);
  console.log(message);

  if (message.length > 30) {
    message = message.slice(0, 30);
  }

  return c.json({ message });
});

export const GET = handle(app);
export const POST = handle(app);

devtools(app, { serveStatic });
