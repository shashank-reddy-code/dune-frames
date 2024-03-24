import dotenv from "dotenv";
dotenv.config();

import { QueryParameter, DuneClient } from "@cowprotocol/ts-dune-client";
import { Headers } from "node-fetch";
import fetch from "node-fetch";

const DUNE_API_KEY = process.env["DUNE_API_KEY"];

export async function getFidStats(fid: number) {
  // schedule the query on a 24 hour interval, and then fetch by filtering for the user fid within the query results
  // dune query: https://dune.com/queries/3555616
  const meta = {
    "x-dune-api-key": DUNE_API_KEY || "",
  };
  const header = new Headers(meta);
  const latest_response = await fetch(
    `https://api.dune.com/api/v1/query/3555616/results?&filters=fid=${fid}`,
    {
      method: "GET",
      headers: header,
    }
  );
  const body = await latest_response.text();
  const trends = JSON.parse(body).result.rows[0]; //will only be one row in the result, for the filtered fid
  delete trends.fid; //pop off the fid column that was used for filtering
  console.log(trends);
  return trends;
}

export async function getTopChannels(fid: number) {
  // schedule the query on a 24 hour interval, and then fetch by filtering for the user fid within the query results
  // dune query: https://dune.com/queries/3556441
  const meta = {
    "x-dune-api-key": DUNE_API_KEY || "",
  };
  const header = new Headers(meta);
  const latest_response = await fetch(
    `https://api.dune.com/api/v1/query/3556441/results?&filters=fid=${fid}`,
    {
      method: "GET",
      headers: header,
    }
  );
  const body = await latest_response.text();
  const topChannels = JSON.parse(body).result.rows[0]; //will only be one row in the result, for the filtered fid
  delete topChannels.fid; //pop off the fid column that was used for filtering
  console.log(topChannels);
  return topChannels.top_10_urls;
}

export async function getFollowerActiveHours(fid: number) {
  // Prepare headers for the request.
  const headers = new Headers({
    "x-dune-api-key": DUNE_API_KEY || "",
  });

  // Fetch the data.
  const response = await fetch(
    `https://api.dune.com/api/v1/query/3556260/results?&filters=fid=${fid}`,
    {
      method: "GET",
      headers: headers,
    }
  );

  // Parse the JSON response.
  const data = await response.json();
  const result = data.result.rows[0]; // Assume there's only one row in the result for the filtered fid

  // Delete 'fid' key if it exists in the result.
  if (result && "fid" in result) {
    delete result.fid;
  }

  // Initialize an object to hold the final counts for all days of the week.
  const weeklyHourlyCounts = {};

  // Process each day's hourly counts.
  Object.keys(result).forEach((day) => {
    const dayCounts = result[day];
    weeklyHourlyCounts[day] = {};

    // Set default count for each hour.
    for (let hour = 0; hour < 24; hour++) {
      weeklyHourlyCounts[day][hour] =
        dayCounts[hour] !== null ? dayCounts[hour] : 0;
    }
  });

  console.log(weeklyHourlyCounts);
  return weeklyHourlyCounts;
}

export async function getRecommendations(fid: number) {
  //schedule the query on a 6 hour interval, and then fetch by filtering for the user fid within the query results
  //dune query: https://dune.com/queries/3509966
  const meta = {
    "x-dune-api-key": DUNE_API_KEY || "",
  };
  const header = new Headers(meta);
  const latest_response = await fetch(
    `https://api.dune.com/api/v1/query/3509966/results?&filters=query_fid=${fid}`,
    {
      method: "GET",
      headers: header,
    }
  );

  const body = await latest_response.text();
  const recs = JSON.parse(body).result.rows[0]; //will only be one row in the result, for the filtered fid
  delete recs.query_fid; //pop off the query_fid column that was used for filtering
  console.log(recs);

  //return four random categories (keys) and users (values) from the recs result
  const keys = Object.keys(recs);
  const randomPairs = [];
  const selectedKeys = new Set();
  while (randomPairs.length < 4 && selectedKeys.size < keys.length) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    if (!selectedKeys.has(randomKey)) {
      const randomValue =
        recs[randomKey][Math.floor(Math.random() * recs[randomKey].length)];
      randomPairs.push({ key: randomKey, value: randomValue });
      selectedKeys.add(randomKey);
    }
  }

  console.log(randomPairs);

  return randomPairs;
}
