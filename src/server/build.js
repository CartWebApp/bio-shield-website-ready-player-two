// @ts-check
import {
    readdirSync,
    writeFileSync,
    readFileSync,
    cpSync,
    mkdirSync,
    existsSync
} from 'fs';
import { transform } from 'lightningcss';
import { join, parse, sep } from 'path';
import { minify } from 'terser';

if (!existsSync(join(process.cwd(), 'src', 'build'))) {
    mkdirSync(join(process.cwd(), 'src', 'build'));
}

for (const file of readdirSync(join(process.cwd(), 'src', 'routes'), {
    withFileTypes: true,
    recursive: true
})) {
    if (!file.isFile()) {
        continue;
    }
    const path = join(
        file.parentPath
            .replaceAll('/', sep)
            .replace(
                join(process.cwd(), 'src', 'routes'),
                join(process.cwd(), 'src', 'build')
            )
    );
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
    const parsed = parse(file.name);
    if (
        (parsed.ext !== '.js' || file.name.endsWith('.remote.js')) &&
        parsed.ext !== '.css'
    ) {
        cpSync(join(file.parentPath, file.name), join(path, file.name), {
            recursive: true
        });
        continue;
    }
    if (parsed.ext === '.js') {
        const contents = readFileSync(
            join(file.parentPath, file.name),
            'utf-8'
        );
        const minified = await minify(contents, {
            module: true
        });
        writeFileSync(join(path, file.name), minified.code ?? '');
    } else {
        const contents = readFileSync(join(file.parentPath, file.name));
        const minified = transform({
            code: contents,
            filename: join(file.parentPath, file.name),
            minify: true
        });
        console.log(path, existsSync(path));
        writeFileSync(join(path, file.name), minified.code);
    }
}
