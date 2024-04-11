import dotenv from "dotenv";
dotenv.config();

const DUNE_API_KEY = process.env["DUNE_API_KEY"];

import { QueryParameter, DuneClient } from "@duneanalytics/client-sdk";
import { Headers } from "node-fetch";
import fetch from "node-fetch";
import natural from "natural";
const { PorterStemmer } = natural;

const client = new DuneClient(DUNE_API_KEY ?? "");

// This function uses a stemmer to reduce words to their base forms,
// and then filters out the unique stems.
const getUniqueWords = (words: string[]) => {
  const stems = words.map((word) => PorterStemmer.stem(word.toLowerCase()));
  const uniqueStems = new Set(stems);

  return Array.from(uniqueStems).map((stem) => {
    // Find the first word that matches the stem and return it.
    return words.find(
      (word) => PorterStemmer.stem(word.toLowerCase()) === stem
    );
  });
};

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

export async function getFollowerTiers(fid: number) {
  // schedule the query on a 24 hour interval, and then fetch by filtering for the user fid within the query results
  // dune query: // https://dune.com/queries/3556783
  const meta = {
    "x-dune-api-key": DUNE_API_KEY || "",
  };
  const header = new Headers(meta);
  const latest_response = await fetch(
    `https://api.dune.com/api/v1/query/3556783/results?&filters=fid=${fid}`,
    {
      method: "GET",
      headers: header,
    }
  );
  const body = await latest_response.text();
  const followerTiers = JSON.parse(body).result.rows[0]; //will only be one row in the result, for the filtered fid
  delete followerTiers.fid; //pop off the fid column that was used for filtering
  console.log(followerTiers);
  //return followerTiers;

  const tierCounts = followerTiers.tier_name_counts;
  const tierPercentages = followerTiers.tier_name_percentages;

  const tierMap: { [key: string]: { count: number; percentage: number } } = {};

  for (const tier in tierCounts) {
    const count = tierCounts[tier];
    const percentage = tierPercentages[tier] || 0;
    tierMap[tier] = { count, percentage };
  }

  const sortedKeys = Object.keys(tierMap).sort((a, b) => {
    return tierMap[b].percentage - tierMap[a].percentage;
  });

  const sortedTierMap: {
    [key: string]: { count: number; percentage: number };
  } = {};
  sortedKeys.forEach((key) => {
    sortedTierMap[key] = tierMap[key];
  });

  return sortedTierMap;
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
      weeklyHourlyCounts[day][hour] = dayCounts[hour] ?? 0;
    }
  });

  console.log(weeklyHourlyCounts);
  return weeklyHourlyCounts;
}

export async function getTopCast(fid: number) {
  //schedule the query on a 24 hour interval, and then fetch by filtering for the user fid within the query results
  //dune query: https://dune.com/queries/3418706
  const meta = {
    "x-dune-api-key": DUNE_API_KEY || "",
  };
  const header = new Headers(meta);
  const latest_response = await fetch(
    `https://api.dune.com/api/v1/query/3418706/results?&filters=fid=${fid}`,
    {
      method: "GET",
      headers: header,
    }
  );

  const body = await latest_response.text();
  const topCast = JSON.parse(body).result.rows[0]; //will only be one row in the result, for the filtered fid
  console.log(topCast);

  return topCast;
}

export async function getTrendingWords(fid: number) {
  //schedule the query on a 24 hour interval, and then fetch by filtering for the user fid within the query results
  //dune query: https://dune.com/queries/3598357

  const queryId = 3598357;
  const query_parameters = [QueryParameter.number("fid", fid)];

  const response = await client.runQuery({ queryId, query_parameters });
  const trendingWords = response.result?.rows[0]; //will only be one row in the result, for the filtered fid
  console.log(trendingWords);

  const uniqueWords = getUniqueWords(trendingWords.words).slice(0, 10);
  console.log(uniqueWords);

  return uniqueWords;
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
