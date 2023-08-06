| 🚧 项目正处于开发中

# bbt

<center>
  <img src="./logo.png" alt="bbt" />
</center>

---

`bbt` 是一个自动化的语言包管理和翻译工具。BBT 是 `Tower of Babel` 即巴别塔的意思，巴别塔是出自《圣经》的一则故事，故事发生在洪水之后，人类开始繁衍生息，他们决定建造一座高塔，塔顶能够触及天空，以此来彰显自己的力量。然而，上帝认为人类过于傲慢，于是让他们说不同的语言，使他们无法沟通，最终导致建塔工程的失败。

<br>
<br>

---

## 工作流程和初衷

作为中文开发者，我们更习惯在中文环境下编程，并且也少有程序员能够掌握多门语言，尤其是比如日语、泰语、法语这类小语种。

因此，我们的程序主要以中文为第一公民。但是，如果我们的程序需要支持多语言，那么我们就需要将中文的内容翻译成其他语言，这就是`bbt`的初衷。

<br>

`bbt`的工作流程如下：

1. 收集所有的翻译内容 - (`npx bbt collection`)
2. 将翻译内容导出到 Excel(excel 文件或者 CSV) 表格中
3. 将 excel 表格发送给翻译人员, 或者程序员通过翻译工具翻译 - (`npx bbt translate`)
4. 翻译人员翻译或校准完成之后，将 excel 表格发送给开发人员
5. 开发人员将 excel 表格导入到项目中
6. 开发人员将 excel 表格回写到语言包中 - (`npx bbt write`)

<br>
<br>

## 安装

```shell
$ npm install @wakeadmin/bbt  // or
$ yarn add @wakeadmin/bbt  // or
$ pnpm add @wakeadmin/bbt

$ npx bbt [command] <options>
```

<br>
<br>

## 命令

### bbt init

初始化，将生成配置文件

```shell
$ npx bbt init
```

执行 init 命令之后, 会生成 `bbt.config.js` 配置文件。默认配置如下：

```js
module.exports = {
  langs: ['zh', 'en'],
  test: '.*\\.tr$',
  exclude: ['node_modules'],
};
```

<br>

`langs` 是我们需要支持的语言，这是一个字符串数组，其中数组的第一项为`基准语言`，也就是我们会通过基准语言来：

- 作为基准翻译到其他语言
- 已基准语言的语言包为基础，对比和推断需要翻译的其他语言包

<br>
<br>

下面详细介绍 bbt.config.js 支持的配置项

```ts
{
  /**
   * 支持的语言列表, 比如 zh, en, ja, en-US
   * 具体取决于开发者如何定义语言标识符
   * bbt 会按照这里定义的标识符进行语言包文件查找和生成
   * 默认为 ['zh', 'en']
   */
  langs?: string[];

  /**
   * 生成的资源目录地址
   *
   * 默认为 './'
   */
  resourcePath?: string;

  /**
   * 语言包文件匹配正则表达式, 比如 '.*\\.tr$'
   * 默认为 '.*\\.tr$'
   */
  test?: string;

  /**
   * 在那个文件夹下收集语言信息
   *
   *  默认为 `./src`
   */
  src?: string;

  /**
   * 忽略收集的文件夹
   * 类型为正则表达式字符串
   * 默认为 ['node_modules']
   */
  exclude?: string[];

  /**
   * Excel 的输出地址
   *
   * 默认为 `./bbt-lang/bbt.csv`
   */
  bbtExcelPath?: string;

  /**
   * 对比规则
   *
   * 默认为 `relaxed`
   *
   * - strict  如果基准值不一致 那么修改其基准值 并清空其他值
   * - relaxed 直接进行合并操作
   */
  diffMode?: DiffModeEnum;

  /**
   * 输出文件的后缀
   *
   * 默认为 `tr`
   */
  outFileExtName?: string;

  /**
   * 自定义插件，用于实现更复杂的场景
   */
  plugins?: {
    /**
     * 自定义文件解析器
     *
     * 在读取文件时 调用`parse`方法将文件内容转换为`JSON`对象
     * 在写入文件时 调用`stringify`方法将`JSON`对象写入到文件中
     */
    parser?: FileParser;

    /**
     * 自定义翻译
     * @param record - 需要翻译的数据源
     * @param target - 翻译的目标语言
     * @param sourceLanguage - 数据源原本的语言
     * @returns Observable<TranslatedList<string>> | Promise<TranslatedList<string>>;
     */
    translator: (
      record: Record<string, string>,
      target: string,
      sourceLanguage: string
    ) => Observable<TranslatedList<string>> | Promise<TranslatedList<string>>;
  };
}
```

<br>
<br>

### bbt collection

收集所有的符合要求的语言包，并将信息提取到 `bbt.csv` 中，方便翻译人员进行翻译和校准。当然你也可以使用 `bbt translate` 自动翻译

| name     | shortName | type     | description  | default           | required |
| -------- | --------- | -------- | ------------ | ----------------- | -------- |
| --config | -c        | `string` | 配置文件地址 | `./bbt.config.js` | `false`  |

<br>
<br>

```shell
$ bbt collection -c ./config/bbt-config.json
```

<br>
<br>
<br>

### bbt translate

```shell
$ npx bbt translate
```

使用翻译 API 对`excel`(bbt.csv)文件进行翻译

| name         | shortName | type                               | description                                                                 | default           | required |
| ------------ | --------- | ---------------------------------- | --------------------------------------------------------------------------- | ----------------- | -------- |
| --translator | -t        | `'google' \| 'deepl' \| 'chatgpt'` | 使用哪个翻译 API, 如果 bbt.config.js 自定义了 translator，则以配置为准      | `'google'`        | `false`  |
| --proxy      | -p        | `string`                           | 正向代理地址 , 如果为空的话，会通过[环境变量进行获取](#环境变量)            | `-`               | `false`  |
| --force      | -f        | `boolean`                          | 是否强制进行翻译, 默认情况下只会翻按需翻译(即无翻译内容时翻译)， 请谨慎开启 | `false`           | `false`  |
| --model      | -         | `'gpt-4' \| 'gpt-3.5-turbo' `      | 使用`chatgpt`进行翻译时所使用的模型                                         | `'gpt-3.5-turbo'` | `false`  |
| --api-key    | -k        | `string`                           | 翻译服务的`API Key `, 如果为空的话，会通过[环境变量进行获取](#环境变量)     | `-`               | `false`  |
| --base-url   | -         | `string`                           | 反向代理地址, 如果为空的话，会通过[环境变量进行获取](#环境变量)             | `-`               | `false`  |

bbt 支持通过 Google、DeepL、ChatGPT 等方案进行初步的机器翻译。如果你想使用其他的翻译服务，可以通过自定义插件的方式进行扩展.

### Google 翻译

默认使用的就是 Google 翻译

```
npx bbt translate -t google --api-key GOOGLE_TRANSLATION_API_KEY
```

可以通过 --api-key 选项或者 BBT_GOOGLE_API_KEY 环境变量来配置 Google 翻译的 API KEY。

我们也建议你将环境变量配置在用户目录下的 .profile 或者 .bashrc 这类文件中，这样可以避免每次都需要输入 API KEY。

Google 翻译需要依赖科学上网，需要自行解决。有两种代理配置方式：

- 通过 --proxy 选项或者 BBT_PROXY 环境变量来配置正向代理地址，bbt 会自动将请求转发到代理地址上
- 通过终端代理的方式进行配置，例如：`export http_proxy=YOU_PROXY_ADDRESS`

<br>
<br>

### DeepL 翻译

和 Google 翻译类似，需要通过 --api-key 选项或者 BBT_DEEPL_API_KEY 环境变量来配置 DeepL 翻译的 API KEY。

<br>

### ChatGPT 翻译

- `--model` 确定使用的 ChatGPT 模型版本。默认为 `gpt-3.5-turbo`
- `--base-url` 或 `BBT_OPEN_AI_BASE_URL` 环境变量。如果你自己搭建了 ChatGPT 的代理服务，可以通过这个选项来配置
- `--api-key` 或 `BBT_OPEN_AI_API_KEY` 配置 OPEN AI 的 API KEY

<br>
<br>
<br>
<br>

### bbt write

```shell
$ npx bbt write
```

将 `bbt.csv` 的翻译结果回填到对应的语言包中，如果对应的语言包不存在，则会自动创建

| name     | shortName | type     | description  | default           | required |
| -------- | --------- | -------- | ------------ | ----------------- | -------- |
| --config | -c        | `string` | 配置文件地址 | `./bbt.config.js` | `false`  |

<br>
<br>
<br>

## 高级

### 支持的环境变量

`bbt` 依赖于以下环境变量

| name                 | description                              |
| -------------------- | ---------------------------------------- |
| BBT_OPEN_AI_API_KEY  | `chatGPT`(`openAI`)服务所依赖的`API Key` |
| BBT_OPEN_AI_BASE_URL | `chatGPT`(`openAI`)服务的反向代理地址    |
| BBT_DEEPL_API_KEY    | `DeepL`服务所依赖的`API Key`             |
| BBT_DEEPL_BASE_URL   | `DeepL`服务的反向代理地址                |
| BBT_GOOGLE_API_KEY   | `Google`服务所依赖的`API Key`            |
| BBT_GOOGLE_BASE_URL  | `Google`服务的反向代理地址               |
| BBT_PROXY            | 使用`translate`命令时的正向代理地址      |

### 自定义解析文件

有时候国际化资源并不是使用`JSON`格式， 因此可以通过`plugins.parser`来自定义文件的解析方式

#### 方法签名

```typescript
export interface FileParser<T = any> {
  parse(str: string): Record<string, T>;
  stringify(record: Record<string, T>): string;
}
```

#### example

`zh.tr`

```text
hello 你好
world 世界
```

`bbt.config.js`

```js
module.exports = {
  // other
  plugins: {
    parser: {
      parse(content) {
        return Object.fromEntries(content.split(/\n/).map(str => str.split(/\s/)));
      },
      stringify(record) {
        return Object.entries(record)
          .map(arr => arr.join(' '))
          .join('\n');
      },
    },
  },
};
```

### 自定义翻译 API

#### 函数签名

```typescript
/**
 *
 * @param record - 需要翻译的数据源
 * @param target - 翻译的目标语言
 * @param sourceLanguage - 数据源原本的语言
 * @returns Observable<TranslatedList<string>> | Promise<TranslatedList<string>>;
 */
translator: (record: Record<string, string>, target: string, sourceLanguage: string) =>
  Observable<TranslatedList<string>> | Promise<TranslatedList<string>>;
```

#### example

```js
// bbt.config.js

module.exports = {
  // other
  plugins: {
    translator: (textMap, target, sourceLanguage) => {
      return Promise.resolve(
        Object.entries(textMap).map(([key, value]) => ({
          target,
          key,
          translatedText: `${value} - ${target}`,
        }))
      );
    },
  },
};
```

<br>
<br>
<br>

## License

MIT
