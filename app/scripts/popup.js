(function($, B) {
    'use strict';

    var doc = $(document),

        BM_ITEM_TYPE_DIRECTORY = 1,
        BM_ITEM_TYPE_BOOKMARK = 2,
        BM_ITEM_TYPE_SEPARATOR = 3,

        STORAGE_KEY_IS_OPEN = '1',

        bmRootList = $('#bookmarks'),
        searchInput = $('#search'),
        bmItems = {},

        bmRootListCache = $();

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
                item = bmItems[itemEl.attr('data-id')],

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
            var input = $(this);
            searchItems(input.val());
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
    });

    function contextMenuDisabled(key, options) {
        var item = bmItems[options.$trigger.closest('.bm-item').attr('data-id')];

        if ( key === 'edit' || key === 'remove' ) {
            if ( item.data.parentId === B.rootFolderId ) {
                return true;
            }
        }

        return false;
    }

    // 处理右键菜单点击事件
    function contextMenuHandler(key, options) {
        var item = bmItems[options.$trigger.closest('.bm-item').attr('data-id')];

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
                    delete bmItems[item.id];
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
        searchText = $.trim(searchText).toLowerCase();


        // 如果是初开始检索，将列表中的条目移入缓存中
        if ( !bmRootListCache.length ) {
            bmRootListCache = bmRootListCache.add(bmRootList.children().detach());
        }
        else {
            bmRootList.empty();
        }

        // 开始查询
        if (searchText) {
            B.traversalBookmarks(function(node) {
                if (node.url && !B.isSeparatorBookmark(node)) {  // is bookmark node
                    var title = $.trim(node.title).toLowerCase(),
                        desc = $.trim(node.desc).toLowerCase(),
                        url = $.trim(node.url).toLowerCase(),
                        item;

                    if (title.indexOf(searchText) !== -1 ||
                        desc.indexOf(searchText) !== -1 ||
                        url.indexOf(searchText) !== -1) {
                        item = createBMItem(node);
                        insertItem(item);
                    }
                }
            });
        }
        // 结束查询，将缓存中的条目再移回列表
        else {
            bmRootList.append(bmRootListCache);
            bmRootListCache = $();
        }
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

    // 打开一个书签目录项
    function closeBMItem(item) {
        item.isOpen = false;
        item.el.removeClass('open');

        item.sublistEl.slideUp();

        B.storage(
            item.id + '-' + STORAGE_KEY_IS_OPEN,
            undefined);
    }

    /**
     * 创建并注册一个书签项，如果该书签项已被创建，则不再重新创建，而是返回已有的。
     */
    function createBMItem(node) {
        var item = bmItems[node.id], el;

        if (!item) {
            el = $(
                '<li id="bmitem-' + node.id + '" class="bm-item"' +
                   ' data-id="' + node.id + '"' +
                   ' data-index="' + node.index + '">' +
                '</li>');

            item = {
                id: node.id,
                data: node,
                el: el,
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

            bmItems[node.id] = item;
        }

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
            '<span class="bm-item-title">' +
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
            '<a class="bm-item-title">' +
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
            '<span class="bm-item-title">' +
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

    /**
     * 将一个书签项插入到书签列表中，
     * 如果当前书签列表中有待插入书签项的父目录项，
     * 则将其插入到父目录项中，
     * 如果父目录项不存在或无法插入到页面中时，
     * 将其插入到根列表下。
     *
     * @param item {Object}
     *     书签项数据对象
     *
     * @param isCreatePath {Boolean}
     *     当父目录项不存在（或没有插入到页面中）时，是否要创建父目录项（或插入到页面中），
     *     若为 false，则会直接将该节点插入到根列表下。
     */
    function insertItem(item, isCreatePath) {
        if (!item) { return; }

        var pId = item.data.parentId,
            pItem = bmItems[pId];

        if (isCreatePath) {
            if (!pItem) {
                chrome.bookmarks.get(pId + '', function(nodes) {
                    var pNode = nodes && nodes[0];

                    if (pNode && B.isCorrectNode(pNode)) {
                        pItem = createBMItem(pNode);
                        insertItem(pItem, isCreatePath);
                    }

                    insert(item);
                });
            }
            else if ( !$.contains(document.body, pItem.el[0]) ) {
                insertItem(pItem, isCreatePath);
                insertToSubList(pItem, item);
            }
            else {
                insert();
            }
        }
        else {
            insert();
        }

        function insert() {
            // 如果父目录项存在，且在页面中
            if (pItem && $.contains(document.body, pItem.el[0])) {
                insertToSubList(pItem, item);
            }
            else {
                insertToRootList(item);
            }
        }

        function insertToRootList(item) {
            bmRootList.append(item.el);
        }

        function insertToSubList(parentItem, subItem) {
            parentItem.sublistEl.append(subItem.el);
        }
    }
})(jQuery, simpleBookmarks);
