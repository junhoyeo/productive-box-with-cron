import githubQuery from '../utils/githubQuery';
import { userInfoQuery } from '../utils/queries';

interface ILogin {
  username: string;
  id: string;
}

const getUserID = async (): Promise<ILogin> => {
  const userResponse = await githubQuery(userInfoQuery)
    .catch(error => console.error(`Unable to get username and id\n${error}`));
  const { login: username, id } = userResponse?.data?.viewer;
  return { username, id };
};

export default getUserID;
