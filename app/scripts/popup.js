$(function() {
    'use strict';

    var doc = $(document),

        bmRootList = $('#bookmarks'),
        bmItems = {};

    simpleBookmarks.traversalBookmarks(
        function(node) {
            var item = createBMItem(node);
            insertItem(item, true);
        }
    );

    doc.on('click', '.bm-item-title', function() {
        var itemEl = $(this).closest('.bm-item');
        toggleBMItem(itemEl.attr('data-id'));
    });

    // 打开一个书签目录项
    // function openBMItem(id) {
    //     var item = bmItems[id];
    //     if (item.sublistEl) {
    //         item.isOpen = true;
    //         item.sublistEl.slideDown();
    //         item.el.addClass('open');
    //     }
    // }

    // 打开一个书签目录项
    // function closeBMItem(id) {
    //     var item = bmItems[id];
    //     if (item.sublistEl) {
    //         item.isOpen = false;
    //         item.sublistEl.slideUp();
    //         item.el.removeClass('open');
    //     }
    // }

    // 打开一个书签目录项
    function toggleBMItem(id) {
        var item = bmItems[id];
        if (item.sublistEl) {
            item.isOpen = !(item.isOpen);
            item.sublistEl.slideToggle();
            item.el.toggleClass('open');
        }
    }

    // 创建一个书签节点
    function createBMItem(node) {
        var itemEl = $('<li class="bm-item"></li>'),
            itemTitleEl = $('<a class="bm-item-title">' + node.title + '</a>'),
            item;

        itemEl.append(itemTitleEl);

        itemEl.attr({
            'id': 'bmitem-' + node.id,
            'data-id': node.id,
            'data-index': node.index
        });

        itemEl.addClass(node.children ? 'bm-item-directory' : 'bm-item-bookmark');

        itemTitleEl.attr({
            href: node.url || 'javascript:'
        });

        item = {
            id: node.id,
            el: itemEl,
            data: node
        };

        bmItems[node.id] = item;
        return item;
    }

    // 创建一个书签子列表
    function createBMSubList(item) {
        var listEl = $('<ul class="bm-sublist"></ul>');

        item.el.append(listEl);
        item.sublistEl = listEl;

        if (item.isOpen !== true) {
            listEl.css('display', 'none');
        }

        return listEl;
    }

    /**
     * 将一个书签项插入到书签列表中
     *
     * @param item {Object}
     *     书签项数据对象
     *
     * @param isCreatePath {Boolean}
     *     当节点父对象不存在时，是否要创建其父节点，
     *     若为 false，则会直接将该节点插入根列表下。
     */
    function insertItem(item, isCreatePath) {

        var pId = item.data.parentId,
            pItem = bmItems[pId];

        if (!pItem && isCreatePath) {
            chrome.bookmarks.get(pId + '', function(nodes) {
                var pNode = nodes && nodes[0];

                if (pNode && simpleBookmarks.isCorrectNode(pNode)) {
                    pItem = createBMItem(pNode);
                    insertItem(item, isCreatePath);
                }

                insert();
            });
        }
        else {
            insert();
        }

        function insert() {
            if (pItem) {
                if (!pItem.sublistEl) {
                    createBMSubList(pItem);
                }

                pItem.sublistEl.append(item.el);
            }
            else {
                bmRootList.append(item.el);
            }
        }
    }
});
