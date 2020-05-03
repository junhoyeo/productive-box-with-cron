export const userInfoQuery = `
  query {
    viewer {
      login
      id
    }
  }
`;

export const createContributedRepoQuery = (username: string) => `
  query {
    user(login: "${username}") {
      repositoriesContributedTo(last: 100) {
        nodes {
          name
          owner {
            login
          }
        }
      }
    }
  }
`;

export const createCommittedDateQuery = (id: string, name: string, owner: string) => `
  query {
    repository(owner: "${owner}", name: "${name}") {
      ref(qualifiedName: "master") {
        target {
          ... on Commit {
            history(first: 100, author: { id: "${id}" }) {
              edges {
                node {
                  committedDate
                }
              }
            }
          }
        }
      }
    }
  }
`;
