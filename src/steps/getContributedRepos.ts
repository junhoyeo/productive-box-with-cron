import githubQuery from '../utils/githubQuery';
import { createContributedRepoQuery } from '../utils/queries';

interface IRepoInfo {
  name: string;
  owner: {
    login: string;
  }
}

interface IRepo {
  name: string;
  owner: string;
}

const getContributedRepos = async (username: string): Promise<IRepo[]> => {
  const contributedRepoQuery = createContributedRepoQuery(username);
  const repoResponse = await githubQuery(contributedRepoQuery)
    .catch(error => console.error(`Unable to get the contributed repo\n${error}`));
  const repos: IRepo[] = repoResponse?.data?.user?.repositoriesContributedTo?.nodes
    .map((repoInfo: IRepoInfo) => ({
      name: repoInfo?.name,
      owner: repoInfo?.owner?.login,
    }));
  return repos;
};

export default getContributedRepos;
