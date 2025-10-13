# TypeORM to Draw.io ER Diagram Generator

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A powerful CLI tool that automatically generates Draw.io Entity-Relationship (ER) diagrams from TypeORM entity definitions in TypeScript. Transform your database schema code into visual diagrams with just one command.

## Features

- 🚀 **Automatic ER Diagram Generation**: Converts TypeORM entities to Draw.io compatible XML format
- 🔍 **Smart Relationship Detection**: Automatically identifies and visualizes relationships between entities
- 📊 **Complete Field Mapping**: Includes all entity fields with type information and constraints
- 🎨 **Professional Diagrams**: Generates clean, organized diagrams with proper ER notation
- 📁 **Batch Processing**: Process multiple entity files at once using glob patterns
- 🛠️ **TypeScript Native**: Full support for TypeScript decorators and type annotations
- ⚡ **Modern Node.js**: Built with Node.js 22+ features for optimal performance

## Prerequisites

- Node.js 22.0.0 or higher
- npm or yarn package manager
- TypeScript 5.7 or higher (for project compilation)

## Installation

### Global Installation

```bash
npm install -g @chelproc/typeorm-to-drawio
```

### Local Installation

Install as a development dependency in your project:

```bash
npm install --save-dev @chelproc/typeorm-to-drawio
```

### From Source

Clone the repository and install dependencies:

```bash
git clone https://github.com/chelproc/typeorm-to-drawio.git
cd typeorm-to-drawio
npm install
npm run build
```

## Usage

### Basic Usage

After global installation, generate a diagram from your TypeORM entities:

```bash
typeorm-to-drawio path/to/entities/*.ts
```

Or use with npx (without global installation):

```bash
npx @chelproc/typeorm-to-drawio path/to/entities/*.ts
```

### Command Line Options

```
Options:
  -o, --output <file>  Output file path (default: entities.drawio)
  -v, --verbose        Enable verbose output
  -h, --help           Show help message
```

### Examples

Process a single entity file:

```bash
typeorm-to-drawio models/User.ts
```

Process multiple entity files:

```bash
typeorm-to-drawio models/User.ts models/Post.ts -o diagram.drawio
```

Process all entities in a directory:

```bash
typeorm-to-drawio models/*.ts -o output/er-diagram.drawio
```

With verbose output:

```bash
typeorm-to-drawio models/**/*.entity.ts -v
```

Using npx (without global installation):

```bash
npx @chelproc/typeorm-to-drawio models/**/*.ts -o diagram.drawio
```

## Supported TypeORM Decorators

The tool recognizes and processes the following TypeORM decorators:

### Entity Decorators

- `@Entity()` - Marks a class as a database entity

### Column Decorators

- `@PrimaryGeneratedColumn()` - Primary key with auto-generation
- `@PrimaryColumn()` - Primary key column
- `@Column()` - Regular column with type and options
- `@CreateDateColumn()` - Auto-generated creation timestamp
- `@UpdateDateColumn()` - Auto-generated update timestamp

### Relationship Decorators

- `@ManyToOne()` - Many-to-one relationships
- `@OneToMany()` - One-to-many relationships
- `@OneToOne()` - One-to-one relationships
- `@ManyToMany()` - Many-to-many relationships
- `@JoinColumn()` - Specifies join column for relationships
- `@JoinTable()` - Specifies join table for many-to-many relationships

## Example

### Input (TypeORM Entity)

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @ManyToOne(() => Organization, (org) => org.users)
  organization: Organization;
}
```

### Output (Draw.io Diagram)

The tool generates a Draw.io compatible XML file that renders as a professional ER diagram with:

- Entity boxes with field listings
- Primary keys marked with [PK]
- Relationship lines with proper cardinality notation (1:1, 1:N, N:N)
- Optional/nullable fields marked with "?"
- Type information for each field

## Project Structure

```
typeorm-to-drawio/
├── src/
│   ├── main.ts                 # CLI entry point
│   ├── parser.ts               # TypeScript AST parser
│   ├── entity-extractor.ts     # Entity and field extraction
│   ├── relationship-analyzer.ts # Relationship analysis
│   ├── drawio-generator.ts     # Draw.io XML generation
│   └── types.ts                # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```
