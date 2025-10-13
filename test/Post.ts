// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Organization } from "./Organization";
import { Tag } from "./Tag";

@Entity()
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column("text")
  content!: string;

  @Column({ default: false })
  published!: boolean;

  @Column("uuid")
  authorId!: string;

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn()
  author!: User;

  @Column("uuid")
  organizationId!: string;

  @ManyToOne(() => Organization, (organization) => organization.posts)
  @JoinColumn()
  organization!: Organization;

  @ManyToMany(() => Tag, (tag) => tag.posts)
  @JoinTable()
  tags!: Tag[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
