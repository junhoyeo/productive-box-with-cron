import { resolve } from 'path';
import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';

import githubQuery from './utils/githubQuery';
import generateBarChart from './utils/generateBarChart';
import { createCommittedDateQuery } from './utils/queries';
import { getUserID, getContributedRepos } from './steps';

config({ path: resolve(__dirname, '../.env') });
const {
  GH_TOKEN = '',
  GIST_ID = '',
  GIST_DESCRIPTION = '',
} = process.env;

(async() => {
  const { username, id } = await getUserID();
  const repos = await getContributedRepos(username);

  interface IEdge {
    node: {
      committedDate: string;
    }
  }

  interface IDay {
    label: string;
    votes: number;
  }

  interface ITime extends IDay {
    startsAt: number;
    endsBefore: number;
  }

  interface ITimeTable {
    [field: string]: ITime;
    morning: ITime;
    daytime: ITime;
    evening: ITime;
    night: ITime;
  }

  const timetable: ITimeTable = {
    morning: { label: '🌞 Morning', votes: 0, startsAt: 6, endsBefore: 12 },
    daytime: { label: '🌆 Daytime', votes: 0, startsAt: 12, endsBefore: 18 },
    evening: { label: '🌃 Evening', votes: 0, startsAt: 18, endsBefore: 24 },
    night: { label: '🌙 Night', votes: 0, startsAt: 0, endsBefore: 6 },
  };

  const voteToTimeTable = (hour: number) => Object
    .entries(timetable)
    .some(([key, { startsAt, endsBefore }]) => {
      if (hour >= startsAt && hour < endsBefore) {
        timetable[key].votes++;
        return true;
      }
      return false;
    });

  const promisesForVoteTimes = repos
    .map(async ({ name, owner }) => {
      const committedTimeResponse = await githubQuery(createCommittedDateQuery(id, name, owner));
      const edges = committedTimeResponse?.data?.repository?.ref?.target?.history?.edges;

      edges.forEach((edge: IEdge) => {
        const committedDate = edge?.node?.committedDate;
        const timeString = new Date(committedDate).toLocaleTimeString(['en-US'], { hour12: false });
        const hour = +(timeString.split(':')[0]);
        voteToTimeTable(hour);
      });
    });

  await Promise
    .all(promisesForVoteTimes)
    .catch((error) => console.error(`Unable to get the commit info\n${error}`));

  /**
   * Next, generate diagram
   */
  const sumOfVotes = Object
    .values(timetable)
    .reduce((a, b) => a + b.votes, 0);
  if (!sumOfVotes) return;

  const oneDay = Object
    .values(timetable)
    .map(({ label, votes }: IDay) => ({ label, commits: votes }));

  const lines = oneDay.reduce((previousResult: any, currentTime) => {
    const percent = currentTime.commits / sumOfVotes * 100;
    const line = [
      `${currentTime.label}`.padEnd(9),
      `${currentTime.commits.toString().padStart(5)} commits`.padEnd(14),
      generateBarChart(percent, 21),
      String(percent.toFixed(1)).padStart(5) + '%',
    ];

    return [...previousResult, line.join(' ')];
  }, []);

  /**
   * Finally, write into gist
   */

  if (!GH_TOKEN) {
    console.error(`Unable to get environment variable 'GH_TOKEN'`);
  } else if (!GIST_ID) {
    console.error(`Unable to get environment variable 'GIST_ID'`);
  }

  const octokit = new Octokit({ auth: `token ${process.env.GH_TOKEN}` });
  const gist = await octokit.gists.get({
    gist_id: GIST_ID,
  }).catch(error => console.error(`Unable to update gist\n${error}`));
  if (!gist) return;

  const filename = Object.keys(gist.data.files)[0];
  const timesCodedEarly = timetable.morning.votes + timetable.daytime.votes;
  const timesCodedNight = timetable.evening.votes + timetable.night.votes;
  const isEarly = timesCodedEarly + timesCodedNight;
  await octokit.gists.update({
    gist_id: GIST_ID,
    description: GIST_DESCRIPTION ?? 'powered by https://github.com/junhoyeo/productive-box-with-cron',
    files: {
      [filename]: {
        filename: isEarly ? "I'm an early 🐤" : "I'm a night 🦉",
        content: lines.join('\n'),
      },
    },
  });
})();
