-- AlterTable: change version columns from Int to Text on Policy and PolicyVersion
ALTER TABLE "Policy" ALTER COLUMN "version" TYPE TEXT USING version::TEXT;
ALTER TABLE "Policy" ALTER COLUMN "version" SET DEFAULT '1.0';
ALTER TABLE "PolicyVersion" ALTER COLUMN "version" TYPE TEXT USING version::TEXT;
