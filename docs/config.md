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
   * 默认为 `./src`
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
