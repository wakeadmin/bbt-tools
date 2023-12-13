import { type BaseAction } from '../cli/baseAction';
import { IBBTValue, KeyTree } from '../utils';



export const RemoveNullValueKeyPlugin = {
  hooks: {
    'collect::before_diff': (tree: KeyTree<IBBTValue>, instance: BaseAction) => {
      let lang = instance.config.langs[0];

      tree.visitor(node => {
        if(node.isLeaf()){
          const value = node.getValue();
          if(!(lang in value)){
            node.parent.delete(node.key);
          }
        }
      })
      
    },
  },
};
