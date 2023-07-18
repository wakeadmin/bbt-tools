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

因此，我们的程序主要以中文为第一公民。但是，如果我们的程序需要支持多语言，那么我们就需要将中文的内容翻译成其他语言，这就是`bbt-tools`的初衷。

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

## 使用

### 安装

```shell
$ npm install @wakeadmin/bbt  // or
$ yarn add @wakeadmin/bbt  // or
$ pnpm add @wakeadmin/bbt

$ npx bbt [command] <options>
```

<br>

### 命令

#### bbt init

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

#### bbt collection

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

使用翻译 API 对`excel`文件进行翻译
并生成一个新的`excel`文件

| name         | shortName | type                  | description                                                            | default    | required |
| ------------ | --------- | --------------------- | ---------------------------------------------------------------------- | ---------- | -------- |
| --translator | -t        | `'google' \| 'deepl'` | 使用哪个翻译 API, 如果 bbt.config.js 自定义了 translator，则以配置为准 | `'google'` | `false`  |
| --proxy      | -p        | `string`              | 代理地址                                                               | `-`        | `false`  |
| --global     | -g        | `boolean`             | 是否进行全局翻译                                                       | `false`    | `false`  |

<br>
<br>
<br>
<br>

#### bbt write

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

<!-- ### update

升级版本

| name       | shortName | type       | description                                                                             | default | required |
| ---------- | --------- | ---------- | --------------------------------------------------------------------------------------- | ------- | -------- |
| --config   | -c        | `string[]` | 要更新的 bbt.config.js 文件路径。为空的话, 会遍历执行目录下的所有文件获取 bbt.config.js | `-`     | `false`  |
| --registry | -r        | `string`   | npm 源地址                                                                              | `-`     | `false`  |

### config

设置全局配置

| name  | shortName | type     | description                                     | default | required |
| ----- | --------- | -------- | ----------------------------------------------- | ------- | -------- |
| --set | -s        | `string` | 设置对应的配置值 比如 `bbt config -s name=Nimi` | `-`     | `false`  |
| --get | -g        | `string` | 获取对应的配置值                                | `-`     | `false`  | -->

<br>
<br>
<br>
<br>

## 高级

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

<!-- #### 初衷

在多语言的开发中，维护各个语言环境下的翻译内容是一件比较繁琐的事

- 如何知道指定 key 是否存在语言缺失的情况
- key 是否会存在冲突
- 语言环境的维护
- 翻译内容迁移问题
- 如何将原始文本提取出来交给翻译人员翻译
- 使用免费的翻译 API 翻译内容
- 多人员开发导致的冲突

`bbt-tools`就是用来处理以上问题的

- 如何知道指定 key 是否存在语言缺失的情况
- 如何将原始文本提取出来交给翻译人员翻译

  `bbt-tools`会收集指定目录下符合规则的所有文件，并根据文件名判断该文件是属于哪种语言环境下的内容（`xxx/zh.tr`即为`zh`下的内容）, 最后整理到一个`excel`文件里， 用户可以通过`excel`自带的筛选可以很直观的知道对应的缺失内容，以及，如果需要交给翻译人员翻译，那么也只需要将该表发送给对应的人员翻译即可，翻译完之后，可以通过`bbt-tools write`将`excel`的内容更新到对应的文件里

- 语言环境的维护

  假设我们现在有`zh`,`en`,`jp`三个语言环境，现在需要新增一个`th`的语言环境，可以直接在`bbt.config.js`的`langs`里添加`th`即可，`bbt-tools`在运行时，会自动的生成`th`环境下的翻译内容（虽然会生成，但是每一个 key 所对应的内容为`''`）;

- key 是否会存在冲突

  我们可以通过协商/命名空间/局部作用域来一定程度上的规避此问题，但是难免会出现`key`重复的情况， `bbt-tools`在运行时会检测`key`是否存在重复的情况

- 翻译内容迁移问题

  默认情况下，如果我们要移动翻译内容，那么需要修改多个文件，`bbt-tools`会在运行时检测对应的`key`的文件路径跟之前的是否一致，不一致的话，那么会更新对应的路径，因此我们只需要更改一个文件即可。

- 使用免费的翻译 API 翻译内容

  内置`google`以及`DeepL`翻译 API, 可以直接开箱即用（请自行解决连不上`google`服务器的问题）， 也可以自行扩展翻译接口，使用自己喜欢的翻译 API 进行翻译，不需要考虑如果收集信息、还原翻译内容的问题；

- 多人员开发导致的冲突

  多人员同时处理一个文本的时候，因为编码习惯、插入/修改位置不一致，会导致`git`难以准确追踪每一个`key`的变更记录。
  `bbt-tools`在生成文件的时候，会对`key`做一次排序，从而可以使得`git`可以精准的追踪每一个`key`的变化，方便我们更加轻松的处理冲突

#### [设计](./docs/design.md)

#### [如何使用](./docs/use.md) -->
