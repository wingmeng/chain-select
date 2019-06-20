(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], function($) {
      return factory($);
    });
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = factory;
	} else {
		return root['ChainSelect'] = factory(root.jQuery);
  }
}(this, function($) {
  var ChainSelect = function(options) {
    var opts = $.extend({}, {
      prompt: '-请选择-',
      onChanged: null,
      data: null,

      // 字段名映射
      alias: {
        value: 'value',  // select option 的 value 值字段名
        label: 'label',  // select option 的文本字段名
        children: 'children',  // 子级字段名
        name: 'name'  // 表单项 name 字段名
      }
    }, options);

    this.$el = opts.el instanceof jQuery ? opts.el : $(opts.el);
    this.$parent = this.$el.parent();
    this.className = this.$el.prop('class') || '';
    this.prompt = opts.prompt;
    this.onChanged = opts.onChanged;
    this.alias = opts.alias;
    this.cache = null;

    if (this.$el.length && opts.data)	{
      this.data = [].concat(opts.data);
      setItemsLevel(this.data, this.alias.children, 0);

      this.render(this.data);
      this.bindEvt();
      this.setDefaultValues(opts.values);
    }

    return {
      setValues: (function(values) {
        this.$el.nextAll('select').remove();
        this.setDefaultValues(values);
      }).bind(this)
    }
  };

  ChainSelect.prototype = {
    constructor: ChainSelect,

    // 设置各个 select 的缺省值
    setDefaultValues: function(values) {
      var that = this;
      var $parent = this.$parent;

      if (Array.isArray(values)) {
        values.forEach(function(value, idx) {
          var curSelect = $parent.children('select').eq(idx);
          that.cache = that.getCurListData(value, idx, that.data);

          that.showNext(idx + 1);
          curSelect.val(value);
        });
      }
    },

    // 获取当前 select value 值对应的数据（当前所有 option）
    getCurListData: function(value, level, data) {
      if (!data) {
        return {};
      }

      var alias = this.alias;
      var queue = [].concat(data);  // 使用数组模拟队列

      // 广度遍历对象
      while(queue.length !== 0) {
        var children;

        data = queue.shift();  // 取出队列第一顶

        // 值相等且层级相同即刻返回（不同层级相同 value 的情况）
        // 注：'1' == 1
        if (getChainObjData(data, alias.value) == value && data._level === level) {
          return data;
        }

        children = getChainObjData(data, alias.children);

        // 将子级加入遍历队列
        if (children) {
          queue = queue.concat(children);
        }
      }
    },

    // 绑定事件
    bindEvt: function() {
      var that = this;
      var cb = this.onChanged;
      
      this.$el.parent()
        .on('change', 'select', function() {
          var value = $(this).val();
          var level = Number($(this).data('level'));
          that.cache = that.getCurListData(value, level, that.data);

          // 移除后续所有 select
          $(this).nextAll('select').remove();

          if (value !== that.prompt) {
            that.showNext(level + 1);
          }

          if (typeof cb === 'function') {
            cb(value, that.cache, $(this));
          }
        });
    },

    // 显示下一个 select（如有）
    showNext: function(level) {
      var nextListData = getChainObjData(this.cache, this.alias.children);

      if (nextListData && nextListData.length) {
        this.$parent.children('select[data-level]:last')
          .after(this.render(nextListData, level));
      }
    },

    // 渲染 view
    render: function(options, level) {
      var html = '';
      var name = getChainObjData(options[0], this.alias.name);

      if (level) {
        html += (
          ' <select class="' + this.className + '" ' +
            'data-level="' + level + '"' +
            (name ? ' name="' + name + '"' : '') +
          '>'
        );
      }

      html += this.builder(options);

      if (!level) {
        this.$el
          .attr('data-level', 0)
          .prop('name', name)
          .html(html);
      } else {
        html += '</select>';
        this.$parent.children('select:last').after(html);
      }
    },

    // 构建 select 的 options
    builder: function(options) {
      var html = '';
      var alias = this.alias;

      if (this.prompt) {
        html += '<option>' + this.prompt + '</option>';
      }

      html += (
        options.map(function(option) {
          var value = getChainObjData(option, alias.value) || '';
          var label = getChainObjData(option, alias.label);

          // 如果 label 不存在，则使用 value 代替
          if (typeof label === 'undefined') {
            label = value;
          }

          return '<option value="' + value + '">' + label + '</option>';
        }).join('')
      );

      return html;
    }
  }

  // 递归数组，为每项设置 level 值
  function setItemsLevel(arr, children_ns, level) {
    arr.forEach(function(item) {
      item._level = level;

      if (Array.isArray(item[children_ns])) {
        setItemsLevel(item[children_ns], children_ns, level + 1);
      }
    });
  }

  /**
   * 获取链式对象的字符串对应的值
   * @param {object | array} data - 原对象或数组
   * @param {string | number} target - 目标对象字符串
   * @example:
      getChainObjData({a: 1, b: {c: 3}}, 'b.c') -> 3
   */
  function getChainObjData(data, target) {
    if (target == undefined) {  // undefined | null
      return data;
    }

    var fields = String(target).split('.');
    
    // 累加链式对象的每一项
    return fields.reduce(function(obj, field) {
      if (obj) {
        return obj[field];
      } else {
        return null;  // 任何一项不存在则最终返回 null
      }
    }, data);
  };

  return ChainSelect;
}));