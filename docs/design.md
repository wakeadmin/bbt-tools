#### init

生成配置文件，后续的所有操作都依赖于该文件

`config`

```js
module.exports = {
  langs: ['zh', 'en'],
  resourcePath: './',
  test: '.*\\.tr$',
  src: './src',
  exclude: ['node_modules'],
  bbtExcelPath: './bbt-lang/bbt.csv',
  diffMode: 'relaxed',
  outFileExtName: 'tr',
};
```

1. `exclude`是一个根据正则进行过滤的数组, 假设`src`设置为`src/`, 且目录如下

```text
- src
  - module
    - test
  - test
  - component
    - test
```

`test` -> 忽略所有`test`目录

`test$` -> 只会忽略`src/module/test`, 不会忽略`src/test`

`^test` -> 只会忽略`src/test`, 不会忽略`src/module/test`

#### collect

- 收集文件

读取配置文件信息，获取指定目录下的所有符合要求的文件, 并通过文件名来判断该文件的语言环境，例如：

```text
./xxxx/xxx/zh.tr =>  文件名为zh => 判断该翻译内容的语言环境为 zh
./xxxx/xxx/en.txxx =>  文件名为en => 判断该翻译内容的语言环境为 en

即 语言环境只跟文件名有关 与路径、后缀无关
```

然后经过对比，输出到`excel`表里;

`excel`表格式如下

1. 前两列固定为`path`和`key`

2. 之后的是根据`config`里的`langs`进行处理

3. `langs`列的内容会在收集过程中根据对应的文件名进行填充内容, 如果对应的文件名不在`langs`里面，那么该内容会被忽略掉：

```text
langs => ['zh','en']
假设有一个 './ssss/lj.tr' 文件, 因为 lj 不在langs里 那么该文件的内容会被忽略掉
```

所有的文件里的`key`必须是唯一的，如果检测到有重复的，那么将抛出一个**错误**;

所有的信息都以收集到的文件信息为标准, 接着跟`excel`的文件进行一次`diff`;

- `diff`模式

  - `strict`

    1. 如果`key`在`excel`表中不存在，那么直接添加到`excel`表里; 不会执行以下操作;

    2. 如果`key`在`excel`表中存在, 那么判断`value`是否一致，不一致的话，那么更新`value`字段, 即读取的文件为`jp.tr`, 那么只会处理`jp`这一列的数据. 如果当前列为`consult`列, 那么在修改值得同时还会清空其他的所有翻译;

       1. `consult`列默认为第三列;

    3. 如果`key`在`excel`表中存在，那么判断`path`是否一致，不一致的话则更新`path`字段;

  - `relaxed`

    1. 如果`key`在`excel`表中不存在，那么直接添加到`excel`表里; 不会执行以下操作;

    2. 如果`key`在`excel`表中存在, 那么判断`value`是否一致，不一致的话，那么更新`value`字段, 即读取的文件为`jp.tr`, 那么只会处理`jp`这一列的数据;

    3. 如果`key`在`excel`表中存在，那么判断`path`是否一致，不一致的话则更新`path`字段;

默认为`relaxed`;

- 输出

  根据上面的`diff`返回的信息更新`excel`文件。

  > 不会处理`excel`的排序，因此，`excel`在经过多次更新之后的字段顺序是会改变的。

#### write

将`excel`里的信息输出到指定的目录下

- 输出文件名称

  目前采用的逻辑是以`${lang}.${outFileExtName}`的格式输出

  假设支持的语言列表为`['zh', 'en', 'jp' ]`

  输出

  ```text
  - zh.tr
  - en.tr
  - jp.tr
  ```

  如果源文件名跟输出文件名一致，那么会进行覆盖操作

  `outFileExtName`为配置文件里值;

#### translate

使用`翻译API`进行翻译

- 是否全局翻译

  - 如果是全局翻译的话，那么会使用第三列作为翻译源，转换成其他的语言，并进行覆盖操作

  - 非全局翻译， 那么会是用第三列作为翻译源，并判断其他列是否存在值， 存在则不进行翻译操作，否则调用`翻译API`进行翻译并重写进`excel文件`

### 设计实现

为了防止`key`重复，因此在`i18n`的处理上，我们基于功能模块，会给对应的语言内容加上一个对应的命名空间，这样就会导致多层对象的嵌套，因此，`bbt-tools`做的第一步便是将这些对象打平，并且基于此，我们可以进行全局的`key`的重复检测；之后，我们的所有操作都依赖于这个打平后的`一维对象`进行操作，但是每个操作所依赖的数据结构却不一致，并且我们还需要对`excel`的文件进行读写操作。因此，封装了`BBTExcel`类来进行`excel`文件的读写操作，而`KeyTree`则是用来管理所有的数据；

- `key`重复检测
  我们无法通过简单的`Map`或者`Set`来进行判断是否重复。
  例如： `A`和`A.AA`是存在重复关系的, 当`A`存在值的时候，必然不会存在`A.AA`的值(这里的值是指基本数据类型的值);

  因此我们需要通过一个字典树来进行检测

- 数据结构
  - `collect`
    该操作的目的便是把`JSON`对象的每一条数据都写入到`excel`文件之中，因此更加关注于`key`。希望得到的数据结构是如下
    ```ts
    interface structure {
      [key: string]: {
        path: string;
        [lang: string]: string;
      };
    }
    ```
  - `translate`
    跟`collect`类似
  - `write`
    该操作的目的是把`JSON`对象写入到对应的文件里，因此更加关注于`path`。希望得到的数据结构是如下
    ```ts
    interface structure {
      [path: string]: {
        [lang: string]: {
          [key: string]: string;
        };
      };
    }
    ```
