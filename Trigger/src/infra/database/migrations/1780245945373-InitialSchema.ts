import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1780245945373 implements MigrationInterface {
    name = 'InitialSchema1780245945373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(80) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying NOT NULL, "github_token" character varying(100), "github_username" character varying(100), "refresh_token" text, "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3c3ab3f49a87e6ddb607f3c494" ON "Users"  ("email") `);
        await queryRunner.query(`CREATE TABLE "environments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "platform" character varying NOT NULL, "branch" character varying NOT NULL, "docker" jsonb, "feature_flags" jsonb NOT NULL DEFAULT '{}', "rate_limit" jsonb, "status" character varying NOT NULL DEFAULT 'idle', "platform_service_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ec32d12469ec3c2f2f20c4f5e71" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "owner_id" uuid NOT NULL, "repo_url" character varying NOT NULL, "repo_provider" character varying NOT NULL DEFAULT 'github', "config_path" character varying NOT NULL DEFAULT 'trigger.yml', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b1bd2fbf5d0ef67319c91acb5c" ON "projects"  ("owner_id") `);
        await queryRunner.query(`CREATE TABLE "deployments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "environment_id" uuid NOT NULL, "project_id" uuid NOT NULL, "triggered_by" uuid NOT NULL, "commit_sha" character varying(40) NOT NULL, "commit_message" text NOT NULL, "status" character varying(20) NOT NULL, "platform" character varying(20) NOT NULL, "platform_deployment_id" character varying, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e5627acb3c950deb83fe98fc48" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_158026eacf6b84129fa515451e" ON "deployments"  ("environment_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a3eb8bbf794c8df7575096f7e9" ON "deployments"  ("project_id") `);
        await queryRunner.query(`CREATE TABLE "deployment_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deployment_id" uuid NOT NULL, "message" text NOT NULL, "level" character varying(10) NOT NULL, "source" character varying(10) NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_e6e53af9ad9c4aa87b99d5c5157" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0076be8931427828530594477a" ON "deployment_logs"  ("deployment_id") `);
        await queryRunner.query(`CREATE TABLE "secrets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "environment_id" uuid NOT NULL, "key" character varying(200) NOT NULL, "encrypted_value" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4ff48ddba1883d4dc142b9c697" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5d63d6824bde55f000fa018431" ON "secrets"  ("environment_id") `);
        await queryRunner.query(`ALTER TABLE "environments" ADD CONSTRAINT "FK_e6abd34366a5d759985d0677616" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "environments" DROP CONSTRAINT "FK_e6abd34366a5d759985d0677616"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d63d6824bde55f000fa018431"`);
        await queryRunner.query(`DROP TABLE "secrets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0076be8931427828530594477a"`);
        await queryRunner.query(`DROP TABLE "deployment_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3eb8bbf794c8df7575096f7e9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_158026eacf6b84129fa515451e"`);
        await queryRunner.query(`DROP TABLE "deployments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1bd2fbf5d0ef67319c91acb5c"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "environments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c3ab3f49a87e6ddb607f3c494"`);
        await queryRunner.query(`DROP TABLE "Users"`);
    }

}
