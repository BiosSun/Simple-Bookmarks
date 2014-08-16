(function($, B) {
    'use strict';

    var doc = $(document),

        STORAGE_KEY_IS_OPEN = '1',

        ANIMATE_TIME = 150,

        bmRootList = $('#bookmarks'),
        searchInput = $('#search'),

        // search
        lastSearchText = '',
        bmRootListCache,

        selectedItem;

    B.init(function() {
        // 构建默认书签列表
        B.getChildren(B.rootFolderId, function(nodes) {
            var historyFolderNode, i, l;

            historyFolderNode = {
                id: B.historyFolderId,
                title: '浏览记录'
            };

            nodes.push(historyFolderNode);

            for (i = 0, l = nodes.length; i < l; i++) {
                createItem(nodes[i], bmRootList);
            }

            // 获取最近的最多 100 条浏览记录
            chrome.history.search({
                text: '',
                maxResults: 100
            }, function(historys) {
                var $folderItem = bmRootList.find('#bmitem-' + historyFolderNode.id),
                    folderItem = $folderItem.data('item'),
                    i, l;

                for (i = 0, l = historys.length; i < l; i++) {
                    createItem(B.createHistoryNode(historys[i]), folderItem);
                }
            });
        });

        // 绑定书签项的点击事件
        bmRootList.on('click', '.bm-item-title', function(e) {
            var itemEl = $(this).closest('.bm-item'),
                item = itemEl.data('item');

            item.toggle([e]);

            return false;
        });

        // 绑定即时搜索相关事件
        searchInput.on('keyup', function() {
            search($(this).val());
        });

        // 处理全局按键事件
        doc.on('keyup', function(e) {
            switch (e.keyCode) {
                // 在页面中的任何位置按 ESC 键，都会显示搜索面板，并将焦点移到搜索框中
                case 27:
                    var searchPanel = $('#fixed-top > .search-panel');

                    if ( searchPanel.is(':hidden') ) {
                        B.showSearchPanel();
                    }

                    $('#search').focus();
                    break;
            }
        });

        // 绑定右键菜单
        $.contextMenu({
            selector: '.bm-item-bookmark .bm-item-title',
            callback: contextMenuHandler,
            items: {
                open: { name: '打开书签' },
                openInNewTab : { name: '在新标签页中打开书签' },
                openInNewWindow : { name: '在新窗口中打开书签' },
                openInStealthWindow : { name: '在隐身窗口中打开书签' },
                sep1 : '----------',
                edit : { name: '编辑' },
                remove : { name: '删除' }
            }
        });
        $.contextMenu({
            selector: '.bm-item-history .bm-item-title',
            callback: contextMenuHandler,
            items: {
                open: { name: '打开链接' },
                openInNewTab : { name: '在新标签页中打开链接' },
                openInNewWindow : { name: '在新窗口中打开链接' },
                openInStealthWindow : { name: '在隐身窗口中打开链接' },
                sep1 : '----------',
                edit : { name: '编辑', disabled: true },
                remove : { name: '删除', disabled: true }
            }
        });
        $.contextMenu({
            selector: '.bm-item-separator .bm-item-title',
            callback: contextMenuHandler,
            items: {
                edit : { name: '编辑' },
                remove : { name: '删除' }
            }
        });
        $.contextMenu({
            selector: '.bm-item-directory .bm-item-title',
            callback: contextMenuHandler,
            items: {
                openAllInNewTab : { name: '在新标签页中打开全部书签' },
                openAllInNewWindow : { name: '在新窗口中打开全部书签' },
                openAllInStealthWindow : { name: '在隐身窗口中打开全部书签' },
                sep1 : '----------',
                edit : { name: '编辑', disabled: contextMenuDisabled },
                remove : { name: '删除', disabled: contextMenuDisabled }
            }
        });

        bmRootList
            // 使用 tab 键在列表中选择书签条目
            .on('focus', '.bm-item-title', function() {
                var item = $(this).closest('.bm-item').data('item');
                selectItem(item);
            })
            // 如果焦点被列表外的元素捕获，则设置所有选择状态为 less 状态
            .on('focusout', function() {
                if (!$.contains(this, document.activeElement)) {
                    selectItem(selectedItem, true);
                }
            })
            // 键盘控制
            .on('keydown', '.bm-item-title', $.proxy(bmItemKeyEventsHandler, null, bmItemTitleKeyDownHandlers))
            .on('keyup', '.bm-item-title', $.proxy(bmItemKeyEventsHandler, null, bmItemTitleKeyUpHandlers));

        // 使用方向键在搜索框及列表间选择条目
        searchInput
            .on('keyup', function(e) {
                var handler = searchInputKeyUpHandlers[e.keyCode];
                if (handler) { handler(); return false; }
                else { return undefined; }
            })
            .on('keydown', function(e) {
                var handler = searchInputKeyDownHandlers[e.keyCode];
                if (handler) { handler(); return false; }
                else { return undefined; }
            });
    });

    var

    bmItemKeyEventsHandler = function(handlers, e) {
        var handler = handlers[e.keyCode],
            item;

        if (handler) {
            item = $(e.target).closest('.bm-item').data('item');
            handler(item, e);
            return false;
        }
        else {
            return undefined;
        }
    },

    bmItemTitleKeyUpHandlers = {
        // enter
        13: function(item, e) {
            item.toggle([e]);
        },
        // remove
        46: function(item) {
            item.remove();
        }
    },
    bmItemTitleKeyDownHandlers = {
        // up
        38: function(item) {
            var prevItem = item.getPrevItem();
            if (prevItem) { selectItem(prevItem); }
            else { searchInput.focus(); }
        },
        // down
        40: function(item) {
            var nextItem = item.getNextItem();
            if (nextItem) { selectItem(nextItem); }
            else {
                selectItem(Item.getFirstItem());
                searchInput.focus();
            }
        },
        // backspace
        8: function(item) {
            var parentItem = item.getParentItem();
            if (parentItem) {
                parentItem.select().close();
            }
        }
    },
    searchInputKeyUpHandlers = {
        // 在敲击回车键时，打开当前列表中被选中的书签条目或历史记录条目
        13: function() {
            if ( selectedItem &&
                 ( selectedItem.type === BookmarkItem.TYPE_ID ||
                   selectedItem.type === HistoryItem.TYPE_ID ) &&
                 selectedItem.el.is(':visible')
               ) {
                B.openUrlInCurrentTab(selectedItem.data.url, true);
            }
        }
    },
    searchInputKeyDownHandlers = {
        // up
        38: function() {
            var item;

            // 如果当前有选中条目，则选择该选中项的上一个条目。
            if ( selectedItem && selectedItem.isVisible() ) {
                item = selectedItem.getPrevItem();
            }

            // 否则选中列表中的最后一个元素
            if ( !item ) {
                item = Item.getLastItem();
            }

            selectItem(item);
        },
        // down
        40: function() {
            var item = selectedItem && selectedItem.isVisible() ?
                    selectedItem : Item.getFirstItem();

            if (item) { item.select(); }
        }
    };

    // 统一处理右键菜单的点击事件
    function contextMenuHandler(key, options) {
        var item = options.$trigger.closest('.bm-item').data('item');

        switch(key) {
            case 'open' :
                B.openUrlInCurrentTab(item.data.url, true);
                break;
            case 'openInNewTab' :
                B.openUrlInNewTab(item.data.url, true);
                break;
            case 'openInNewWindow' :
                B.openUrlInNewWindow(item.data.url);
                break;
            case 'openInStealthWindow' :
                B.openUrlInNewWindow(item.data.url, true);
                break;
            case 'openAllInNewTab' :
                openChildrens(item.id, '新标签页', function(urls) { B.openUrlInNewTab(urls, true); });
                break;
            case 'openAllInNewWindow' :
                openChildrens(item.id, '新窗口', function(urls) { B.openUrlInNewWindow(urls); });
                break;
            case 'openAllInStealthWindow' :
                openChildrens(item.id, '隐身窗口', function(urls) { B.openUrlInNewWindow(urls, true); });
                break;
            case 'remove' :
                item.remove();
                break;
            case 'edit' :
                B.edit(item.data, function() {
                    // update el data
                    item.update();
                });
                break;
        }
    }

    // 统一处理右键菜单项的禁用检查
    function contextMenuDisabled(key, options) {
        var item = options.$trigger.closest('.bm-item').data('item');

        if ( key === 'edit' || key === 'remove' ) {
            // 根目录不能修改
            if ( item.data.parentId === B.rootFolderId ) {
                return true;
            }
            // 虚拟目录不能修改
            if ( item.id < 0 ) {
                return true;
            }
        }

        return false;
    }

    // 使用某种方式打开指定的书签目录内的所有子书签
    function openChildrens(id, openMode, openOperation) {
        B.getChildrenUrls(id, function(urls) {
            if (urls.length > 0) {
                B.confirm('你确定要在' + openMode + '中打开这 ' + urls.length + ' 个页面吗？', function() {
                    openOperation(urls);
                });
            }
        });
    }

    // 根据一个字符串查询书签项和历史记录
    function search(searchText) {
        var isFirstMatching = true;

        searchText = $.trim(searchText).toLowerCase();

        if (searchText === lastSearchText) { return; }

        // 如果是初开始检索，将列表中的条目移入缓存中
        if ( !bmRootListCache ) {
            bmRootListCache = bmRootList.children().detach();
        }
        else {
            bmRootList.empty();
        }

        // 包含查询文字时，开始进行查询
        if (searchText) {
            // 插入查询书签结果目录和查询浏览记录结果目录这两个虚拟目录
            var searchBookmarkFolderItem = createItem({
                    id: B.searchBookmarkFolderId,
                    title: '书签'
                }, bmRootList),
                searchHistoryFolderItem = createItem({
                    id: B.searchBookmarkFolderId,
                    title: '浏览记录'
                }, bmRootList);

            searchBookmarkFolderItem.open(undefined, false);
            searchHistoryFolderItem.open(undefined, false);

            // 检索书签
            B.traversalBookmarks(function(node) {
                if ( node.url && !node.isSeparatorBookmark ) {  // is bookmark node
                    var item;

                    if ( B.isMatching(node, searchText) ) {
                        item = createItem(node, searchBookmarkFolderItem);

                        if ( isFirstMatching ) {
                            selectItem(item, true);
                            isFirstMatching = false;
                        }
                    }
                }
            });

            // 检索历史记录
            chrome.history.search({
                text: '',
                maxResults: 3000
            }, function(historys) {
                var node, item, i, l;

                for (i = 0, l = historys.length; i < l; i++) {
                    node = B.createHistoryNode(historys[i]);
                    if ( B.isMatching(node, searchText) ) {
                        item = createItem(node, searchHistoryFolderItem);

                        if ( isFirstMatching ) {
                            selectItem(item, true);
                            isFirstMatching = false;
                        }
                    }
                }
            });
        }
        // 结束查询，将缓存中的条目再移回列表
        else {
            bmRootList.append(bmRootListCache);
            bmRootListCache = null;
        }

        lastSearchText = searchText;
    }

    /**
     * 选中一个条目
     *
     * @param item! {Object} {当前列表中的第一个条目} 需要选中的条目。
     *
     * @param less! {Boolean} {false}
     *     是否是静默选中，当为静默选中时，在将元素标记为选中状态的同时，
     *     也会标识一个静默状态，同时不会将让该条目取得焦点。
     *     如果要取消静默状态，只要重新选中该条目即可。
     */
    function selectItem(item, less) {
        // if not give item, the item default is first item in bookmark list.
        if ( typeof item === 'boolean' ) {
            less = item;
            item = undefined;
        }

        // if item is undefined, is not give item.
        if (item === undefined) {
            item = bmRootList.find('.bm-item:first').data('item');
        }
        // if give item, but item is null, is error, quit function.
        else if ( item === null ) {
            return;
        }

        item.select(less);
    }

    /**
     * 创建并注册一个书签项，如果该书签项已被创建，则不再重新创建，而是返回已有的。
     */
    function createItem(node, parent) {
        var item;

        if (node.url) {
            // separator
            if (node.isSeparatorBookmark) {
                item = new SeparatorItem(node, parent);
            }
            // history
            else if (node.isHistory) {
                item = new HistoryItem(node, parent);
            }
            // bookmark
            else {
                item = new BookmarkItem(node, parent);
            }
        }
        // folder
        else {
            item = new DirectoryItem(node, parent);
        }

        return item;
    }

    var

    Item = Class.create({
        Statics: {
            get: function(id) {
                return bmRootList.find('#bmitem-' + id).data('item');
            },
            getLastItem: function() {
                return bmRootList.find('.bm-item:visible:last').data('item');
            },

            getFirstItem: function() {
                return bmRootList.find('.bm-item:visible:first').data('item');
            }
        },

        initialize: function(node, parent) {
            // init props
            this.id     = node.id;
            this.data   = node;
            this.type   = this.constructor.TYPE_ID;
            this.el     = $(
                '<li id="bmitem-' + node.id + '" class="bm-item"' +
                    ' data-id="' + node.id + '"' +
                    ' data-index="' + node.index + '"' +
                    ' data-type="' + this.type + '">' +
                    '</li>'
            );

            this.fill();
            this.titleEl = this.el.find('> .bm-item-title');

            this.update();

            // 创建双向绑定
            this.el.data('item', this);

            // 插到父节点中
            if (parent) {
                if (parent === bmRootList) {
                    bmRootList.append(this.el);
                }
                else if (parent.type === DirectoryItem.TYPE_ID) {
                    parent.sublistEl.append(this.el);
                }
            }

            // 打开
            if (this.isOpen) {
                this.open(undefined, false);
            }
        },

        update: function() {
            this.el.attr('data-index', this.data.index);
        },

        /**
         * 删除条目
         */
        remove: function() {
            var self = this;

            chrome.bookmarks.removeTree(self.id, function() {
                self.el.slideUp(ANIMATE_TIME, function() {
                    self.el.remove();
                });
            });
        },

        /**
         * 选中一个条目
         *
         * @param less! {Boolean} {false}
         *     是否是静默选中，当为静默选中时，在将元素标记为选中状态的同时，
         *     也会标识一个静默状态，同时不会将让该条目取得焦点。
         *     如果要取消静默状态，只要重新选中该条目即可。
         */
        select: function(less) {
            if (selectedItem) {
                selectedItem.el.removeClass('selected less');
            }

            this.el.addClass('selected');

            if (less) {
                this.el.addClass('less');
            }
            else if (this.titleEl[0] !== document.activeElement) {
                this.titleEl.focus();
            }

            selectedItem = this;

            return this;
        },

        toggle: function(args, sw) {
            args = args || [];

            if ( sw !== false && (sw || !this.isOpen) ) {
                this.open.apply(this, args);
            }
            else {
                this.close.apply(this, args);
            }

            return this;
        },

        open: function() {
            return this;
        },
        close: function() {
            return this;
        },

        isVisible: function() {
            return this.el.is(':visible');
        },

        getParentItem: function() {
            return Item.get(this.data.parentId);
        },

        /**
         * 获取当前条目在列表中的上一个条目
         */
        getPrevItem: function() {
            var allItemEl = bmRootList.find('.bm-item:visible'),
                prevItemElIndex = allItemEl.index(this.el) - 1;

            return prevItemElIndex !== -1 ?
                allItemEl.eq(prevItemElIndex).data('item') :
                undefined;
        },

        /**
         * 获取当前条目在列表中的下一个条目
         */
        getNextItem: function() {
            var allItemEl = bmRootList.find('.bm-item:visible'),
                nextItemElIndex = allItemEl.index(this.el) + 1;

            return nextItemElIndex < allItemEl.length ?
                allItemEl.eq(nextItemElIndex).data('item') :
                undefined;
        }
    }),

    DirectoryItem = Item.extend({
        Statics: {
            TYPE_ID: 1
        },

        initialize: function(node, parent) {
            this.isOpen = node.isOpen || B.storage(node.id + '-' + STORAGE_KEY_IS_OPEN);
            DirectoryItem.superclass.initialize.call(this, node, parent);
        },

        fill: function() {
            this.sublistEl = $('<ul class="bm-sublist" style="display:none"></ul>');
            this.el.addClass('bm-item-directory').append(
                '<span class="bm-item-title" tabindex="0">' +
                    '<i class="bm-item-favicon"></i>' +
                    '<span class="text"></span>' +
                '</span>',
                this.sublistEl
            );
        },

        update: function() {
            DirectoryItem.superclass.update.call(this);
            this.el.find('> .bm-item-title .text').text(this.data.title);
        },

        remove: function() {
            var self = this;

            B.getChildren(this.id, function(nodes) {
                var count = 0,
                    bookmarkCount = 0,
                    folderCount = 0,
                    bookmarkMsg, folderMsg;

                // 统计数量
                $.each(nodes, function(i, node) {
                    if (node.url) {
                        if (!node.isSeparatorBookmark) {
                            count++;
                            bookmarkCount++;
                        }
                    }
                    else {
                        count++;
                        folderCount++;
                    }
                });

                // 如果为空目录，则直接删除
                if (count === 0) {
                    supe();
                }
                // 否则给出提示，待确认后删除
                else {
                    bookmarkMsg = bookmarkCount + ' 个书签';
                    folderMsg = folderCount + ' 个子目录';

                    self.open();

                    B.confirm(
                        '你确定要删除该目录吗？<br />' +
                        self.data.title + ' 目录包含 ' +
                        ( bookmarkCount && folderCount ? bookmarkMsg + '及 ' + folderMsg :
                                         bookmarkCount ? bookmarkMsg :
                                                         folderMsg ) +
                        '。',
                        function() {
                            supe();
                        }
                    );
                }
            });

            function supe() {
                DirectoryItem.superclass.remove.call(self);
            }
        },

        open: function(keys, animate) {
            var self = this;

            keys = keys || {};

            self.isOpen = true;
            self.el.addClass('open');

            // 存储打开状态
            B.storage(
                self.id + '-' + STORAGE_KEY_IS_OPEN,
                true);


            // 插入子书签项
            if (self.id >= 0) {
                B.getChildren(self.id, function(subnodes) {
                    if (!subnodes) { return; }

                    var i, l;

                    for (i = 0, l = subnodes.length; i < l; i++) {
                        createItem(subnodes[i], self);
                    }

                    if (animate !== false) {
                        self.sublistEl.slideDown(ANIMATE_TIME);
                    }
                    else {
                        self.sublistEl.show();
                    }
                });
            }
            else {
                if (animate !== false) {
                    self.sublistEl.slideDown(ANIMATE_TIME);
                }
                else {
                    self.sublistEl.show();
                }
            }

            return this;
        },

        close: function() {
            var self = this;
            self.isOpen = false;
            self.el.removeClass('open');

            self.sublistEl.slideUp(ANIMATE_TIME, function() {
                if (self.id >= 0) {
                    self.sublistEl.empty();
                }
            });

            self.el.add(self.el.find('.bm-item.open')).map(function() {
                B.storage(
                    $(this).attr('data-id') + '-' + STORAGE_KEY_IS_OPEN,
                    undefined);
            });

            return this;
        }
    }),

    BookmarkItem = Item.extend({
        Statics: {
            TYPE_ID: 2
        },

        fill: function() {
            this.el.addClass('bm-item-bookmark').append(
                '<a class="bm-item-title" tabindex="0">' +
                    '<i class="bm-item-favicon">' +
                        '<img />' +
                    '</i>' +
                    '<span class="text"></span>' +
                '</a>'
            );
        },

        update: function() {
            var title = this.data.title,
                url = this.data.url;

            BookmarkItem.superclass.update.call(this);

            this.el.find('.bm-item-title').toggleClass('isurl', !title).attr('href', url)
                   .find('.text').text(title || url).end()
                   .find('.bm-item-favicon img').attr('src', 'chrome://favicon/' + url);
        },

        open: function(keys) {
            keys = keys || {};

            var url = this.data.url,
                isCtrlMeta = keys.ctrlKey || keys.metaKey,
                isShift = keys.shiftKey;

            if (isCtrlMeta) {
                B.openUrlInNewTab(url, true);
            }
            else if (isShift) {
                B.openUrlInNewWindow(url);
            }
            else {
                B.openUrlInCurrentTab(url, true);
            }

            return this;
        }
    }),

    HistoryItem = Item.extend({
        Statics: {
            TYPE_ID: 4
        },

        fill: function() {
            this.el.addClass('bm-item-history').append(
                '<a class="bm-item-title" tabindex="0">' +
                    '<span class="last-visit-time"></span>' +
                    '<span class="visit-count"></span>' +
                    '<i class="bm-item-favicon">' +
                        '<img />' +
                    '</i>' +
                    '<span class="text"></span>' +
                '</a>'
            );
        },

        update: function() {
            var title = this.data.title,
                url = this.data.url,
                lastVisitTime = this.data.lastVisitTime,
                visitCount = this.data.visitCount;

            HistoryItem.superclass.update.call(this);

            this.el.find('.bm-item-title').toggleClass('isurl', !title).attr('href', url)
                   .find('.text').text(title || url).end()
                   .find('.bm-item-favicon img').attr('src', 'chrome://favicon/' + url).end()
                   .find('.last-visit-time').text(moment(lastVisitTime).format('YYYY-MM-DD')).end()
                   .find('.visit-count').text(visitCount);
        },

        open: function(keys) {
            keys = keys || {};

            var url = this.data.url,
                isCtrlMeta = keys.ctrlKey || keys.metaKey,
                isShift = keys.shiftKey;

            if (isCtrlMeta) {
                B.openUrlInNewTab(url, true);
            }
            else if (isShift) {
                B.openUrlInNewWindow(url);
            }
            else {
                B.openUrlInCurrentTab(url, true);
            }

            return this;
        }

    }),

    SeparatorItem = Item.extend({
        Statics: {
            TYPE: 3
        },

        fill: function() {
            this.el.addClass('bm-item-separator').append(
                '<span class="bm-item-title" tabindex="0">' +
                    '<span class="line-l"></span>' +
                    '<span class="text"></span>' +
                    '<span class="line-r"></span>' +
                '</span>'
            );
        },

        update: function() {
            var title  = this.data.title;
            SeparatorItem.superclass.update.call(this);
            this.el.find('.bm-item-title .text').toggleClass('h', !title).text(title);
        }
    });
})(jQuery, simpleBookmarks);
