import fetch, { RequestInfo } from "node-fetch";

export const JsonPostFetch = async (url: RequestInfo, body: any) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error(`couldn't contact node`);
    return { success: false };
  }
};

export const JsonGetFetch = async (url: RequestInfo) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error(`couldn't contact node`);
    return { success: false };
  }
};
