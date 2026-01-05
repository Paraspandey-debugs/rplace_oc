import NextAuth, { type AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || ''
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      return token
    },
    async session({ session, token }) {
      return session
    }
  }
}

export default NextAuth(authOptions)
