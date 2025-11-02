// script to collect folder structure from a root folder
// To use this edit const root which should be set to an existing folder of interest
// const root is set in line 15 below, 
// npm install to install dependencies
// nps ts-node scripts/generateData.ts ehich will replace the .json file at ./src/data.json with data based on file structre at root
// then build the project with npm run build to compile the typescript sources to javascript
// then open index.html from folder ./static folder

import { error } from 'console';
import * as fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { Directory, File } from '../src/model';

const root = '/home/jsavage/langium';

const subDirectories = collectSubDirectories(root);
const files = collectTsFiles(root);

const output: Directory = {
    name: 'root',
    path: root,
    directories: subDirectories,
    files: files,
    isExpandable: subDirectories.length > 0 || files.length > 0
};

fs.writeFileSync(path.resolve(__dirname, '../src/data.json'), JSON.stringify(output));

function collectSubDirectories(root: string): Directory[] {
    const directories: Directory[] = [];

    const directoriesNames = fs.readdirSync(root)
        .filter(name => fs.statSync(`${root}/${name}`).isDirectory());

    directoriesNames.forEach(name => {
        const subDirectories = collectSubDirectories(`${root}/${name}`);
        const files = collectTsFiles(`${root}/${name}`);
        const isExpandable = subDirectories.length > 0 || files.length > 0;
        directories.push({
            name,
            path: `${root}/${name}`,
            directories: subDirectories,
            files: files,
            isExpandable: isExpandable
        });
    });

    return directories;
}

function collectTsFiles(root: string): File[] {
    const tsFiles: File[] = fs.readdirSync(root)
        .filter(name => fs.statSync(`${root}/${name}`).isFile()
            && name !== 'index.ts'
            && !name.endsWith('.d.ts')
            && !name.endsWith('.spec.ts')
            && (name.endsWith('.ts') || name.endsWith('.tsx')))
        .map(name => ({
            name,
            path: `${root}/${name}`,
            imports: getImports(`${root}/${name}`)
        }));

    return tsFiles;
}

function getImports(file: string): string[] {
    const imports: string[] = [];
    const tsHost = ts.createCompilerHost({});
    const sourceFile = tsHost.getSourceFile(file, ts.ScriptTarget.Latest, (err) => console.log(err));
    if (!sourceFile) {
        throw new error(`Could not read file ${file}`);
    }
    delintNode(sourceFile, imports, sourceFile);
    const resolvedImports = resolveImports(imports, file);
    return resolvedImports;
}

function delintNode(node: ts.Node, imports: string[], sourceFile: ts.SourceFile) {
    if (ts.isImportDeclaration(node)) {
        const modulePath = node.moduleSpecifier.getText(sourceFile).replace(/["']/g, '');
        if(modulePath.startsWith('./')) {
            imports.push(modulePath);
        }
    } else {
        ts.forEachChild(node, (n) => delintNode(n, imports, sourceFile));
    }
}

function resolveImports(imports: string[], file: string): string[] {
    const resolvedImports: string[] = []
    imports.forEach((importPath, index) => {
        const resolvedPath = path.resolve(path.dirname(file), importPath);
        if (fs.existsSync(resolvedPath) && resolvedPath.startsWith(root)) {
            resolvedImports.push(resolvedPath);
        } else if (fs.existsSync(resolvedPath + '.ts') && resolvedPath.startsWith(root)) {
            resolvedImports.push(resolvedPath + '.ts');
        } else if (fs.existsSync(resolvedPath + '.tsx') && resolvedPath.startsWith(root)) {
            resolvedImports.push(resolvedPath + '.tsx');
        }
    });

    return resolvedImports;
}
