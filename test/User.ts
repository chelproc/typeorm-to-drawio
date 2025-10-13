// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Organization } from "./Organization";
import { Post } from "./Post";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  organizationId!: string;

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn()
  organization!: Organization;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Post[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
