(function($, B) {
    'use strict';

    var doc = $(document),

        BM_ITEM_TYPE_DIRECTORY = 1,
        BM_ITEM_TYPE_BOOKMARK = 2,
        BM_ITEM_TYPE_SEPARATOR = 3,

        STORAGE_KEY_IS_OPEN = '1',

        bmRootList = $('#bookmarks'),
        searchInput = $('#search'),

        // search
        lastSearchText = '',
        bmRootListCache,

        selectedItem;

    B.init(function() {
        // 构建默认书签列表
        B.getChildren(B.rootFolderId, function(nodes) {
            var i, l, item, node;
            for (i = 0, l = nodes.length; i < l; i++) {
                node = nodes[i];
                item = createBMItem(node);
                bmRootList.append(item.el);

                if (item.isOpen) {
                    openBMItem(item, false);
                }
            }
        });

        // 绑定书签项的点击事件
        bmRootList.on('click', '.bm-item-title', function(e) {
            var itemEl = $(this).closest('.bm-item'),
                item = itemEl.data('item'),

                isCtrlMeta = e.ctrlKey || e.metaKey,
                isShift = e.shiftKey,

                url;

            if (itemEl.hasClass('bm-item-directory')) {
                toggleBMItem(item);
            }
            else if (itemEl.hasClass('bm-item-bookmark')) {
                url = item.data.url;

                if (isCtrlMeta) {
                    B.openUrlInNewTab(url, true);
                }
                else if (isShift) {
                    B.openUrlInNewWindow(url);
                }
                else {
                    B.openUrlInCurrentTab(url, true);
                }
            }

            return false;
        });

        // 绑定即时搜索相关事件
        searchInput.on('keyup', function() {
            searchItems($(this).val());
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
                case 13:
                    var selectedItemEl = bmRootList.find('.bm-item.selected'),
                        selectedItem = selectedItemEl.data('item');

                    // TODO: 目前只支持打开 1 个选择条目
                    if ( selectedItem.type === BM_ITEM_TYPE_BOOKMARK ) {
                        B.openUrlInCurrentTab(selectedItem.data.url, true);
                    }
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

        // 使用 tab 键在列表中选择书签条目
        bmRootList
            .on('focus', '.bm-item-title', function() {
                var item = $(this).closest('.bm-item').data('item');
                selectBMItem(item);
            })
            // 如果焦点被列表外的元素捕获，则设置所有选择状态为 less 状态
            .on('focusout', function() {
                if (!$.contains(this, document.activeElement)) {
                    selectBMItem(selectedItem, true);
                }
            });

        // 使用方向键在搜索框及列表间选择条目
        searchInput
            .on('keydown', function(e) {
                var handler = searchInputKeyDownHandlers[e.keyCode];
                if (handler) { handler(); return false; }
                else { return undefined; }
            });
    });

    bmRootList.on('keydown', '.bm-item-title', function(e) {
        var handler = bmItemTitleKeyDownHandlers[e.keyCode],
            $title, $item, item;

        if (handler) {
            $title = $(this);
            $item = $title.closest('.bm-item');
            item = $item.data('item');

            handler(item, $item, $title, e);
            return false;
        }
        else {
            return undefined;
        }
    });

    var
    bmItemTitleKeyDownHandlers = {
        // up
        38: function(item, $item) {
            var allItemEl = bmRootList.find('.bm-item'),
                selItemElIndex = allItemEl.index($item) - 1;

            if (selItemElIndex !== -1) {
                selectBMItem(allItemEl.eq(selItemElIndex).data('item'));
            }
            else {
                searchInput.focus();
            }
        },
        // down
        40: function(item, $item) {
            var allItemEl = bmRootList.find('.bm-item'),
                selItemElIndex = (allItemEl.index($item) + 1) % allItemEl.length;

            if (selItemElIndex !== 0) {
                selectBMItem(allItemEl.eq(selItemElIndex).data('item'));
            }
            else {
                selectBMItem(allItemEl.eq(selItemElIndex).data('item'), true);
                searchInput.focus();
            }
        }
    },

    searchInputKeyDownHandlers = {
        // up
        38: function() {
            var $allItems = bmRootList.find('.bm-item'),
                $item;

            // 如果当前有选中条目，则选择该选中项的上一个条目。
            if (selectedItem && selectedItem.el.is(':visible')) {
                $item = $allItems.eq($allItems.index(selectedItem.el) - 1);
            }
            else {
                $item = $allItems.last();
            }

            selectBMItem($item.data('item'));
        },
        // down
        40: function() {
            selectBMItem(selectedItem);
        }
    };

    function contextMenuDisabled(key, options) {
        var item = options.$trigger.closest('.bm-item').data('item');

        if ( key === 'edit' || key === 'remove' ) {
            if ( item.data.parentId === B.rootFolderId ) {
                return true;
            }
        }

        return false;
    }

    // 处理右键菜单点击事件
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
                chrome.bookmarks.removeTree(item.id, function() {
                    item.el.remove();
                });
                break;
            case 'edit' :
                B.edit(item.data, function() {
                    // update el data
                    updateBMItem(item);
                });
                break;
        }
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

    // 根据一个字符串查询书签项
    function searchItems(searchText) {
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
            B.traversalBookmarks(function(node) {
                if ( node.url && !node.isSeparatorBookmark ) {  // is bookmark node
                    var item;

                    if ( B.isMatching(node, searchText) ) {
                        item = createBMItem(node);
                        bmRootList.append(item.el);

                        if ( isFirstMatching ) {
                            selectBMItem(item, true);
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
    function selectBMItem(item, less) {
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

        if (selectedItem) {
            selectedItem.el.removeClass('selected less');
        }

        item.el.addClass('selected');

        if (less) {
            item.el.addClass('less');
            bmRootList.scrollTop(item.el.position().top - parseInt(bmRootList.css('padding-top')));
        }
        else if (item.titleEl[0] !== document.activeElement) {
            item.titleEl.focus();
        }

        selectedItem = item;
    }

    // 切换一个书签目录项的打开与关闭状态
    function toggleBMItem(item, sw) {
        if (sw || !item.isOpen) {
            openBMItem(item);
        }
        else {
            closeBMItem(item);
        }
    }

    // 打开一个书签目录项
    function openBMItem(item, animate) {
        item.isOpen = true;
        item.el.addClass('open');

        // 存储打开状态
        B.storage(
            item.id + '-' + STORAGE_KEY_IS_OPEN,
            true);


        // 插入子书签项
        B.getChildren(item.id, function(subnodes) {
            var subitem, subnode, i, l;

            for (i = 0, l = subnodes.length; i < l; i++) {
                subnode = subnodes[i];
                subitem = createBMItem(subnode);
                item.sublistEl.append(subitem.el);

                if (subitem.isOpen) {
                    openBMItem(subitem, animate);
                }
            }

            if (animate !== false) {
                item.sublistEl.slideDown();
            }
            else {
                item.sublistEl.show();
            }
        });

    }

    // 关闭一个书签目录项
    function closeBMItem(item) {
        item.isOpen = false;
        item.el.removeClass('open');

        item.sublistEl.slideUp(function() {
            item.sublistEl.empty();
        });

        item.el.add(item.el.find('.bm-item.open')).map(function() {
            B.storage(
                $(this).attr('data-id') + '-' + STORAGE_KEY_IS_OPEN,
                undefined);
        });
    }

    /**
     * 创建并注册一个书签项，如果该书签项已被创建，则不再重新创建，而是返回已有的。
     */
    function createBMItem(node) {
        var item = {
            id: node.id,
            data: node,
            el: $(
                '<li id="bmitem-' + node.id + '" class="bm-item"' +
                   ' data-id="' + node.id + '"' +
                   ' data-index="' + node.index + '">' +
                '</li>'
            ),
            isOpen: B.storage(node.id + '-' + STORAGE_KEY_IS_OPEN)
        };

        // bookmark
        if (node.url) {
            // separator bookmark
            if (node.isSeparatorBookmark) {
                fillBMSeparatorItem(item);
                item.type = BM_ITEM_TYPE_SEPARATOR;
            }
            // common bookmark
            else {
                fillBMBookmarkItem(item);
                item.type = BM_ITEM_TYPE_BOOKMARK;
            }
        }
        // folder
        else {
            fillBMDirectoryItem(item);
            item.type = BM_ITEM_TYPE_DIRECTORY;
        }

        // 创建双向绑定
        item.el.data('item', item);
        item.titleEl = item.el.find('> .bm-item-title');

        return item;
    }

    /**
     *  根据节点数据更新 Item 的显示内容
     */
    function updateBMItem(item) {
        item.el.attr('data-index', item.data.index);

        // bookmark
        if (item.data.url) {
            // separator bookmark
            if (item.data.isSeparatorBookmark) {
                updateBMSeparatorItem(item);
            }
            // common bookmark
            else {
                updateBMBookmarkItem(item);
            }
        }
        // folder
        else {
            updateBMDirectoryItem(item);
        }
    }

    function fillBMDirectoryItem(item) {
        item.sublistEl = $('<ul class="bm-sublist" style="display:none"></ul>');
        item.el.addClass('bm-item-directory').append(
            '<span class="bm-item-title" tabindex="0">' +
                '<i class="bm-item-favicon"></i>' +
                '<span class="text"></span>' +
            '</span>',
            item.sublistEl
        );

        updateBMDirectoryItem(item);
    }

    function updateBMDirectoryItem(item) {
        item.el.find('.bm-item-title .text').text(item.data.title);
    }

    function fillBMBookmarkItem(item) {
        item.el.addClass('bm-item-bookmark').append(
            '<a class="bm-item-title" tabindex="0">' +
                '<i class="bm-item-favicon">' +
                    '<img />' +
                '</i>' +
                '<span class="text"></span>' +
            '</a>'
        );

        updateBMBookmarkItem(item);
    }

    function updateBMBookmarkItem(item) {
        var title = item.data.title,
            url = item.data.url;

        item.el.find('.bm-item-title').toggleClass('isurl', !title).attr('href', url)
               .find('.text').text(title || url).end()
               .find('.bm-item-favicon img').attr('src', 'chrome://favicon/' + url);
    }

    function fillBMSeparatorItem(item) {
        item.el.addClass('bm-item-separator').append(
            '<span class="bm-item-title" tabindex="0">' +
                '<span class="line-l"></span>' +
                '<span class="text"></span>' +
                '<span class="line-r"></span>' +
            '</span>'
        );

        updateBMSeparatorItem(item);
    }

    function updateBMSeparatorItem(item) {
        var title  = item.data.title;
        item.el.find('.bm-item-title .text').toggleClass('h', !title).text(title);
    }
})(jQuery, simpleBookmarks);
