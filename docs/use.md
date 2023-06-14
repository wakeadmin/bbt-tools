## 安装

```
npm install @wakeadmin/bbt-tools  -g // or
yarn global add @wakeadmin/bbt-tools  // or
pnpm install @wakeadmin/bbt-tools -g

wkbbt [command] <options>
```

## command

### init

生成配置文件

```
wkbbt init
```

```typescript
  /**
   *  支持的语言列表
   */
  langs: string[];
  /**
   * 生成的资源目录地址
   * 
   * 默认为 './'
   */
  resourcePath: string;
  /**
   * 文件匹配正则
   */
  test: string;
  /**
   *  在那个文件夹下收集语言信息
   *
   *  默认为 `./src`
   */
  src: string;
  /**
   * 忽略的文件夹 类型为正则表达式字符串
   */
  exclude: string[];
  /**
   * excel 的输出地址
   *
   * 默认为 `./bbt-lang/bbt.csv`
   */
  bbtExcelPath: string;
  /**
   * 对比规则
   *
   * 默认为 `relaxed`
   *
   * - strict  如果基准值不一致 那么修改其基准值 并清空其他值
   * - relaxed 直接进行合并操作
   */
  diffMode: DiffModeEnum;
  /**
   * 输出文件的后缀
   *
   * 默认为 `tr`
   */
  outFileExtName: string;
  /**
   * 当前版本
   */
  __version: string;

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
```

### collection

收集所有的符合要求的文件

| name     | shortName | type     | description  | default             | required |
| -------- | --------- | -------- | ------------ | ------------------- | -------- |
| --config | -c        | `string` | 配置文件地址 | `./bbt.config.js` | `false`   |

```
wkbbt collection -c ./config/bbt-config.json

```

### build

根据`excel`文件生成对应的资源文件

| name     | shortName | type     | description  | default             | required |
| -------- | --------- | -------- | ------------ | ------------------- | -------- |
| --config | -c        | `string` | 配置文件地址 | `./bbt.config.js` | `false`   |

```
wkbbt build
```

### translate

使用翻译 API 对`excel`文件进行翻译
并生成一个新的`excel`文件

| name         | shortName | type                  | description      | default    | required |
| ------------ | --------- | --------------------- | ---------------- | ---------- | -------- |
| --translator | -t        | `'google' \| 'deepl'` | 使用哪个翻译 API | `'google'` | `false`  |
| --proxy      | -p        | `string`              | 代理地址         | `-`        | `false`  |
| --global     | -g        | `boolean`             | 是否进行全局翻译 | `false`    | `false`  |

```
wkbbt translate
```

### update

升级版本

| name       | shortName | type       | description                                                                                 | default | required |
| ---------- | --------- | ---------- | ------------------------------------------------------------------------------------------- | ------- | -------- |
| --config   | -c        | `string[]` | 要更新的 bbt.config.js 文件路径。为空的话, 会遍历执行目录下的所有文件获取 bbt.config.js | `-`     | `false`  |
| --registry | -r        | `string`   | npm 源地址                                                                                  | `-`     | `false`  |

### config

设置全局配置

| name  | shortName | type     | description                                       | default | required |
| ----- | --------- | -------- | ------------------------------------------------- | ------- | -------- |
| --set | -s        | `string` | 设置对应的配置值 比如 `wkbbt config -s name=Nimi` | `-`     | `false`  |
| --get | -g        | `string` | 获取对应的配置值                                  | `-`     | `false`  |

---

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
