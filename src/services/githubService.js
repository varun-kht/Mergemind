import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function getPRDiff(repo, prNumber) {

  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3.diff"
    }
  });

  return response.data;
}