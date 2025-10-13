// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Post } from "./Post";

@Entity()
export class Organization {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 100 })
  plan!: string;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => Post, (post) => post.organization)
  posts!: Post[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
