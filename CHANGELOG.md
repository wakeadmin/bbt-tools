# @wakeadmin/bbt

## 0.3.1

### Patch Changes

- feat : 现在每次翻译完成之后会删除对应的占位符缓存 [d97d2ea](https://github.com/wakeadmin/bbt-tools/commit/d97d2eabd0822680c51938a389ff9ff93a92f56d)


## 0.3.0

### Minor Changes

- feat : 调增 chatgpt 的 promat
- feat : 新增 interpolationMap


## 0.2.2

### Patch Changes

- fix: 修复环境变量值错误的问题


## 0.2.1

### Patch Changes

- feat: 现在会强制将`Number`类型转成`String`


## 0.2.0

### Minor Changes

- feat: 新增钩子函数, 并允许用户自定义
- feat: 现在在基准语言文件中删除`key`, 将会被认定为删除该条记录

## 0.1.7

### Patch Changes

- fix: 修复值为数字时无法正常写入文件的问题

## 0.1.6

### Patch Changes

- feat: 允许自定义排序
- fix: 修复警告信息会多次显示的问题

## 0.1.5

### Patch Changes

- feat: 现在`csv`会依照`key`的顺序进行排序

## 0.1.4

### Patch Changes

- fix: 修复`parseKey`没有正确解析的问题
