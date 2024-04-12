import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function summarizeReplies(
  cast: string,
  replies: any
): Promise<string> {
  try {
    // Concatenate your replies into a single string, if not already done. You might want to add some separator or preprocessing based on your data format.
    const prompt = `Please summarize a collection of replies I will share and identify the top 3 frequently mentioned topics. These topics should let a new user who has not read the whole list of replies to quickly get an idea of the of the core themes being talked about. 
    
    This is the original post which the user likely has read :\n\n${cast}. We dont want to call out extremely obvious stuff from the post itself but find interesting themes being talked about in the replies. 
    
    PROVIDE 3 WORDS UNDER STRICTLY 80 CHARACTERS IN TOTAL, SEPARATED BY COMMAS summarizing frequently yet interesting themes in the replies. Makee sure to weigh the replies based on the numnber of likes each on has. More liked replies should get a higher weight when you are trying to summarize the topics. Again avoid obvious topics that are already in the original post. Please avoid $DEGEN as a stop word if its frequently mentioned. 
    
    Here is a json array of the replies along with the number of likes each one got :\n\n${JSON.stringify(
      replies
    )}
    
    REMEMBER AGAIN, RESPONSE NEEDS TO BE STRICTLY UNDER 80 CHARACTERS TOTAL.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });

    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      if (content && content.length > 80) {
        return await shortenString(content);
      } else {
        return content || "Unable to generate summary.";
      }
    } else {
      return "Unable to generate top mentions. Please try again.";
    }
  } catch (error) {
    console.error("Error while generating top mentions:", error);
    throw new Error("Failed to summarize replies.");
  }
}

export async function shortenString(input: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Please summarize the following words under 80 characters, separated by comma" +
            input,
        },
      ],
    });
    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      if (content && content.length > 80) {
        return content.substring(0, 80) + "...";
      } else {
        return content || "Unable to generate summary.";
      }
    } else {
      return "Unable to generate summary.";
    }
  } catch (error) {
    console.error("Error while generating summary:", error);
    throw new Error("Failed to summarize string.");
  }
}
