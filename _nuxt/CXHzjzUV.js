import{D as v,C as r,a4 as l,N as m,u as y}from"#entry";function b(){const u=y(),t=v("posts",()=>[]),c=r(()=>t.value?.length),d=r(()=>{const e=t.value?.map(a=>l(a.data.category)?a.data.category.data?.name:null).filter(Boolean);return[...new Set(e)].sort()}),o="All",i=m(o),f=r(()=>i.value===o?t.value:t.value?.filter(e=>l(e.data.category)&&e.data.category.data?.name===i.value));async function g(){if(!t.value.length){const e=await u.client.getAllByType("blog_post",{orderings:{field:"document.first_publication_date",direction:"desc"},graphQuery:`{
          blog_post {
              uid
              title
              image
              category {
                ...on blog_post_category {
                    name
                }
              }
          }
        }`});s(e)}}function p(e){if(!t.value)return null;const a=t.value.findIndex(n=>n.uid===e);return a>=0&&a<t.value.length-1?t.value[a+1]:null}function s(e){if(!Array.isArray(e)||!t.value)return;const a=e.map(n=>({data:n.data,first_publication_date:n.first_publication_date,uid:n.uid}));t.value=[...t.value,...a]}return{postsCount:c,filters:d,filteredPosts:f,activeFilter:i,ALL_FILTER:o,fetchPosts:g,findNext:p,addPosts:s,postsState:t}}export{b as u};
