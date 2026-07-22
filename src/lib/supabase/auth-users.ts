interface AuthDirectoryUser {
  id: string;
  email?: string;
}

interface AuthDirectoryPage {
  data: {
    users: AuthDirectoryUser[];
    nextPage?: number | null;
  };
  error: { message: string } | null;
}

type ListAuthUsers = (params: {
  page: number;
  perPage: number;
}) => Promise<AuthDirectoryPage>;

export async function findAuthUserByEmail(
  listUsers: ListAuthUsers,
  email: string,
): Promise<AuthDirectoryUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let page: number | null = 1;
  const visitedPages = new Set<number>();

  while (page !== null && !visitedPages.has(page)) {
    visitedPages.add(page);
    const { data, error } = await listUsers({ page, perPage: 1000 });

    if (error) {
      throw new Error(`ログインアカウントの確認に失敗しました: ${error.message}`);
    }

    const user = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (user) return user;
    page = data.nextPage ?? null;
  }

  return null;
}
