const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "s3.eu-central-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "cantine-restaurant.medusajs.app",
      },
      ...(S3_HOSTNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
