const fs = require('fs-extra')
const path = require('path')
const handlebars = require('handlebars')

console.log('Building...')

const viewsDir = path.join(__dirname, '../src/views')
const pagesDir = path.join(viewsDir, 'pages')
const buildDir = path.join(__dirname, '../build')
const partialDir = path.join(viewsDir, 'partials')
const scriptsSrcDir = path.join(__dirname, '../src/scripts')
const scriptsDestDir = path.join(buildDir, 'scripts')

fs.emptydirSync(buildDir)
fs.copySync(scriptsSrcDir, scriptsDestDir)

const extractScripts = (templateContent) => {
    const match = templateContent.match(/{{!--\s*scripts:\s*(\[.*?\])\s*--}}/s)
    if (match) {
        try {
            return JSON.parse(match[1])
        }catch (err) {
            console.log('Error', err)
        }
    }
    return []
}

const mainTemplateSource = fs.readFileSync(
    path.join(viewsDir, 'layouts/main.hbs'),
    'utf8'
)
const mainTemplate = handlebars.compile(mainTemplateSource)

// Сделать эту сачть кода уневерсальный в плане того чтобы partial можно было бы роскидать по директориях
const partialsDir = path.join(viewsDir, 'partials')
fs.readdirSync(partialsDir).forEach(file => {
    const filePath = path.join(partialsDir, file)
    const partialName = path.basename(file, '.hbs')
    const partialContent = fs.readFileSync(filePath, 'utf8')
    handlebars.registerPartial(partialName, partialContent)
    // console.log(partialName)
})

fs.readdirSync(pagesDir).forEach(file => {
    const pageName = path.basename(file, '.hbs')
    const filePath = path.join(pagesDir, file)
    const pageContent = fs.readFileSync(filePath, 'utf8')
    const pageTemplate = handlebars.compile(pageContent)

    let scripts = extractScripts(pageContent)

    console.log(pageName)
    // иещт скрпит в partials
    fs.readdirSync(partialsDir).forEach(partialsFile => {
        const partialContent = fs.readFileSync(path.join(partialsDir, partialsFile), 'utf8')
        const partialName = path.basename(partialsFile, '.hbs')
        const usedInPage = pageContent.includes(`{{> ${partialName}}}`)
        if (usedInPage) {
            const partialScript = extractScripts(partialContent)
            scripts = scripts.concat(partialScript)
        }
    })

    // Удаление дкбликатов зарахунок того что scripts ининицалицоваиться  в SET()
    scripts = [...new Set(scripts)]
    console.log(scripts)

    const finalHtml = mainTemplate({
        title: pageName,
        body: pageTemplate({}),
        scripts
    })

    fs.writeFileSync(path.join(buildDir, `${pageName}.html`), finalHtml)

})

console.log('✅ Build')
